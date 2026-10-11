type Env = Record<string, string | undefined>;

const API_VERSION = "v63.0";
const QUERY_TIMEOUT_MS = 30_000;
/** Salesforce access tokens don't say when they expire; renew well before the usual session timeout. */
const TOKEN_TTL_MS = 30 * 60 * 1000;

export type DataCloudConfig =
  | { status: "disabled" }
  /** Production: an External Client App with the client credentials flow. */
  | { status: "client-credentials"; instanceUrl: string; clientId: string; clientSecret: string }
  /** Local development only: a short-lived token, e.g. from `sf org display`. */
  | { status: "access-token"; instanceUrl: string; accessToken: string };

export function getDataCloudConfig(env: Env = process.env): DataCloudConfig {
  const instanceUrl = env.SF_INSTANCE_URL?.trim().replace(/\/+$/, "");
  if (!instanceUrl || !instanceUrl.startsWith("https://")) return { status: "disabled" };

  const clientId = env.SF_CLIENT_ID?.trim();
  const clientSecret = env.SF_CLIENT_SECRET?.trim();
  if (clientId && clientSecret) return { status: "client-credentials", instanceUrl, clientId, clientSecret };

  const accessToken = env.SF_ACCESS_TOKEN?.trim();
  if (accessToken) return { status: "access-token", instanceUrl, accessToken };

  return { status: "disabled" };
}

export class DataCloudError extends Error {
  name = "DataCloudError";
}

let cachedToken: { value: string; instanceUrl: string; expiresAt: number } | null = null;

async function getToken(config: Exclude<DataCloudConfig, { status: "disabled" }>) {
  if (config.status === "access-token") return { value: config.accessToken, instanceUrl: config.instanceUrl };
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken;

  const res = await fetch(`${config.instanceUrl}/services/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
    signal: AbortSignal.timeout(QUERY_TIMEOUT_MS),
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) {
    console.error(JSON.stringify({ event: "datacloud_auth_error", status: res.status, error: body.error }));
    throw new DataCloudError(`No se pudo autenticar con Salesforce (HTTP ${res.status})`);
  }
  cachedToken = {
    value: body.access_token,
    instanceUrl: (body.instance_url ?? config.instanceUrl).replace(/\/+$/, ""),
    expiresAt: Date.now() + TOKEN_TTL_MS,
  };
  return cachedToken;
}

export type Row = Record<string, string | number | null>;

/** Data Cloud returns positional rows plus a metadata map; turn them into named rows. */
export function toRows(body: { data?: unknown[][]; metadata?: Record<string, { placeInOrder?: number }> }): Row[] {
  const metadata = body.metadata ?? {};
  const columns = Object.keys(metadata).sort(
    (a, b) => (metadata[a].placeInOrder ?? 0) - (metadata[b].placeInOrder ?? 0),
  );
  return (body.data ?? []).map((values) =>
    Object.fromEntries(columns.map((column, i) => [column, (values[i] ?? null) as string | number | null])),
  );
}

/** Runs a read-only SQL query against the Data Cloud Query API (v2). */
export async function queryDataCloud(sql: string, config: DataCloudConfig = getDataCloudConfig()): Promise<Row[]> {
  if (config.status === "disabled") throw new DataCloudError("Data Cloud no está configurado");

  const token = await getToken(config);
  const startedAt = Date.now();
  const res = await fetch(`${token.instanceUrl}/services/data/${API_VERSION}/ssot/queryv2`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token.value}`, "Content-Type": "application/json" },
    body: JSON.stringify({ sql }),
    signal: AbortSignal.timeout(QUERY_TIMEOUT_MS),
    cache: "no-store",
  });

  if (!res.ok) {
    if (res.status === 401) cachedToken = null;
    const body = await res.text().catch(() => "");
    console.error(JSON.stringify({ event: "datacloud_query_error", status: res.status, body: body.slice(0, 500) }));
    throw new DataCloudError(`La consulta a Data Cloud falló (HTTP ${res.status})`);
  }

  const rows = toRows(await res.json());
  console.info(JSON.stringify({ event: "datacloud_query", rows: rows.length, durationMs: Date.now() - startedAt }));
  return rows;
}

/** For tests: forget the cached token. */
export function resetDataCloudToken() {
  cachedToken = null;
}

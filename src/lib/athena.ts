import {
  AthenaClient,
  GetQueryExecutionCommand,
  GetQueryResultsCommand,
  StartQueryExecutionCommand,
  StopQueryExecutionCommand,
} from "@aws-sdk/client-athena";
import { createLimiter } from "@/lib/concurrency";
import { QuerySourceError, type Row } from "@/lib/query-error";

type Env = Record<string, string | undefined>;

const QUERY_TIMEOUT_MS = 30_000;
/** Queries in flight per server instance; the rest wait their turn. */
const MAX_CONCURRENT_QUERIES = 8;

export type AthenaConfig =
  | { status: "disabled" }
  | {
      status: "enabled";
      region: string;
      /** `database.table` with the WhatsApp events. */
      table: string;
      workgroup: string;
      /** s3:// folder for results; empty uses the workgroup's own. */
      outputLocation?: string;
      /**
       * A technical user's key (Vercel). Without it, the AWS SDK default chain is used:
       * locally, `AWS_PROFILE` with an SSO session (`aws sso login`).
       */
      credentials?: { accessKeyId: string; secretAccessKey: string };
    };

/** An AWS access key id: AKIA… (long-term) or ASIA… (temporary), 20 characters. */
const ACCESS_KEY_ID = /^(AKIA|ASIA)[A-Z0-9]{16}$/;

/**
 * Athena is on when `ATHENA_REGION` and `ATHENA_TABLE` are set. The key goes in
 * `ATHENA_ACCESS_KEY_ID` / `ATHENA_SECRET_ACCESS_KEY` rather than the usual AWS_* names,
 * which Vercel reserves for its own runtime. On Vercel there is no AWS session to fall
 * back on, so without a real key (e.g. a placeholder) Athena stays off and the app keeps
 * using Data Cloud.
 */
export function getAthenaConfig(env: Env = process.env): AthenaConfig {
  const region = env.ATHENA_REGION?.trim();
  const table = env.ATHENA_TABLE?.trim();
  if (!region || !table) return { status: "disabled" };
  const keyId = env.ATHENA_ACCESS_KEY_ID?.trim();
  const secret = env.ATHENA_SECRET_ACCESS_KEY?.trim();
  const hasKey = !!keyId && ACCESS_KEY_ID.test(keyId) && !!secret;
  if (env.VERCEL && !hasKey) return { status: "disabled" };
  const accessKeyId = hasKey ? keyId : undefined;
  const secretAccessKey = hasKey ? secret : undefined;
  return {
    status: "enabled",
    region,
    table,
    workgroup: env.ATHENA_WORKGROUP?.trim() || "primary",
    outputLocation: env.ATHENA_OUTPUT_LOCATION?.trim() || undefined,
    credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
  };
}

export class AthenaError extends QuerySourceError {
  name = "AthenaError";
}

type EnabledConfig = Exclude<AthenaConfig, { status: "disabled" }>;

let cachedClient: { key: string; client: AthenaClient } | null = null;

function clientFor(config: EnabledConfig): AthenaClient {
  const key = `${config.region}|${config.credentials?.accessKeyId ?? "default"}`;
  if (cachedClient?.key !== key) {
    cachedClient = { key, client: new AthenaClient({ region: config.region, credentials: config.credentials }) };
  }
  return cachedClient.client;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Athena returns every value as text, with the column names in the metadata. */
async function readResults(client: AthenaClient, queryId: string): Promise<Row[]> {
  const rows: Row[] = [];
  let columns: string[] = [];
  let nextToken: string | undefined;
  let first = true;
  do {
    const page = await client.send(
      new GetQueryResultsCommand({ QueryExecutionId: queryId, NextToken: nextToken, MaxResults: 1000 }),
    );
    if (first) columns = (page.ResultSet?.ResultSetMetadata?.ColumnInfo ?? []).map((c) => c.Name ?? "");
    const data = page.ResultSet?.Rows ?? [];
    // The first row of the first page repeats the column names.
    for (const row of first ? data.slice(1) : data) {
      rows.push(Object.fromEntries(columns.map((column, i) => [column, row.Data?.[i]?.VarCharValue ?? null])));
    }
    first = false;
    nextToken = page.NextToken;
  } while (nextToken);
  return rows;
}

async function runQuery(sql: string, config: EnabledConfig): Promise<Row[]> {
  const client = clientFor(config);
  const startedAt = Date.now();
  let queryId: string | undefined;
  try {
    const started = await client.send(
      new StartQueryExecutionCommand({
        QueryString: sql,
        WorkGroup: config.workgroup,
        ResultConfiguration: config.outputLocation ? { OutputLocation: config.outputLocation } : undefined,
      }),
    );
    queryId = started.QueryExecutionId;
    if (!queryId) throw new AthenaError("Athena no ha devuelto el identificador de la consulta");

    // Poll quickly at first (most queries take 1–3 s), then back off.
    for (let wait = 200; ; wait = Math.min(wait * 1.5, 1000)) {
      const { QueryExecution } = await client.send(new GetQueryExecutionCommand({ QueryExecutionId: queryId }));
      const state = QueryExecution?.Status?.State;
      if (state === "SUCCEEDED") {
        const rows = await readResults(client, queryId);
        console.info(
          JSON.stringify({
            event: "athena_query",
            rows: rows.length,
            scannedBytes: QueryExecution?.Statistics?.DataScannedInBytes,
            durationMs: Date.now() - startedAt,
          }),
        );
        return rows;
      }
      if (state === "FAILED" || state === "CANCELLED") {
        throw new AthenaError(`La consulta a Athena falló: ${QueryExecution?.Status?.StateChangeReason ?? state}`);
      }
      if (Date.now() - startedAt > QUERY_TIMEOUT_MS) {
        await client.send(new StopQueryExecutionCommand({ QueryExecutionId: queryId })).catch(() => {});
        throw new AthenaError("La consulta a Athena ha tardado demasiado");
      }
      await sleep(wait);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ event: "athena_query_error", queryId, message: message.slice(0, 500) }));
    if (error instanceof AthenaError) throw error;
    // Missing or expired credentials, permissions, network: the detail stays in the logs.
    throw new AthenaError(`No se pudo consultar Athena (${error instanceof Error ? error.name : "error"})`);
  }
}

const withSlot = createLimiter(MAX_CONCURRENT_QUERIES);

/** Runs a read-only SQL query in Athena, a few at a time per instance (MAX_CONCURRENT_QUERIES). */
export async function queryAthena(sql: string, config: AthenaConfig = getAthenaConfig()): Promise<Row[]> {
  if (config.status === "disabled") throw new AthenaError("Athena no está configurado");
  return withSlot(() => runQuery(sql, config));
}

/** For tests: forget the cached client. */
export function resetAthenaClient() {
  cachedClient = null;
}

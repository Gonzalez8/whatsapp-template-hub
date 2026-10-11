import type { MetaWaba, MetaPaginatedResponse, Template, Waba, WabaPhoneNumber } from "@/types/template";
import { settleWithConcurrency } from "./concurrency";

const META_API = "https://graph.facebook.com/v23.0";
const FETCH_TIMEOUT_MS = 15_000;
/**
 * WABAs fetched in parallel. Each one issues 2+ requests, so this caps concurrent
 * calls to Meta. Measured with 73 WABAs: unlimited ~5s, 16 ~5s, 4 ~14s.
 */
const WABA_CONCURRENCY = 16;

export class MetaConfigError extends Error {
  name = "MetaConfigError";
}

export class MetaApiError extends Error {
  name = "MetaApiError";

  constructor(
    message: string,
    readonly status: number,
    readonly code?: number,
  ) {
    super(message);
  }
}

interface MetaErrorBody {
  error?: { message?: string; code?: number; fbtrace_id?: string };
}

async function metaGet<T>(url: string, token: string, context: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    // Caching happens once for the whole snapshot (see templates.ts), not per request.
    cache: "no-store",
  });

  if (!res.ok) {
    const body: MetaErrorBody = await res.json().catch(() => ({}));
    // Full details stay in the server logs; only a short message reaches the UI.
    console.error(
      JSON.stringify({
        event: "meta_api_error",
        context,
        status: res.status,
        code: body.error?.code,
        message: body.error?.message,
        fbtrace_id: body.error?.fbtrace_id,
      }),
    );
    throw new MetaApiError(
      `${context}: ${body.error?.message || res.statusText || "error"} (HTTP ${res.status})`,
      res.status,
      body.error?.code,
    );
  }

  return res.json();
}

async function fetchAllPages<T>(firstUrl: string, token: string, context: string): Promise<T[]> {
  const items: T[] = [];
  let url: string | null = firstUrl;

  while (url) {
    const page: MetaPaginatedResponse<T> = await metaGet(url, token, context);
    items.push(...(page.data ?? []));
    url = page.paging?.next ?? null;
  }

  return items;
}

function fetchTemplates(wabaId: string, token: string): Promise<Template[]> {
  return fetchAllPages(
    `${META_API}/${wabaId}/message_templates?fields=id,name,status,category,language,components,quality_score&limit=500`,
    token,
    `Templates de la WABA ${wabaId}`,
  );
}

async function fetchPhoneNumbers(wabaId: string, token: string): Promise<WabaPhoneNumber[]> {
  try {
    return await fetchAllPages(
      `${META_API}/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,quality_rating,status`,
      token,
      `Teléfonos de la WABA ${wabaId}`,
    );
  } catch {
    // Phone numbers are secondary info: a failure here must not hide the templates.
    return [];
  }
}

/**
 * Fetches every WABA owned by the business with its templates and phone numbers.
 *
 * A failing WABA is returned with `error` set so the rest can still be shown,
 * but if the WABA list or every single WABA fails, this throws: callers rely on
 * that to keep serving the last good cached snapshot instead of an error.
 */
export async function fetchWabasWithTemplates(): Promise<Waba[]> {
  const token = process.env.META_ACCESS_TOKEN;
  const businessId = process.env.META_BUSINESS_ID;

  if (!token || !businessId) {
    throw new MetaConfigError("Faltan las variables META_ACCESS_TOKEN o META_BUSINESS_ID");
  }

  const startedAt = Date.now();
  const wabas = await fetchAllPages<MetaWaba>(
    `${META_API}/${businessId}/owned_whatsapp_business_accounts?fields=id,name&limit=100`,
    token,
    "Listado de WABAs",
  );

  const settled = await settleWithConcurrency(wabas, WABA_CONCURRENCY, async (waba): Promise<Waba> => {
    const [templates, phone_numbers] = await Promise.all([
      fetchTemplates(waba.id, token),
      fetchPhoneNumbers(waba.id, token),
    ]);
    return { waba_id: waba.id, waba_name: waba.name, phone_numbers, templates };
  });

  const failed = settled.filter((r) => r.status === "rejected").length;

  console.info(
    JSON.stringify({
      event: "meta_templates_fetched",
      wabas: wabas.length,
      failed,
      durationMs: Date.now() - startedAt,
    }),
  );

  if (wabas.length > 0 && failed === wabas.length) {
    const firstError = (settled[0] as PromiseRejectedResult).reason;
    throw firstError instanceof Error ? firstError : new Error("No se pudo cargar ninguna WABA");
  }

  return settled.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : {
          waba_id: wabas[i].id,
          waba_name: wabas[i].name,
          phone_numbers: [],
          templates: [],
          error: r.reason instanceof Error ? r.reason.message : "Error desconocido",
        },
  );
}

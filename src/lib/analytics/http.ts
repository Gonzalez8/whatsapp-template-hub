import { auth } from "@/auth";
import { DataCloudError } from "@/lib/datacloud";
import { getTemplatesSnapshot } from "@/lib/templates";
import type { Waba } from "@/types/template";
import { getAnalyticsConfig } from "./config";
import { InvalidQueryParam } from "./queries";
import { takeRequest } from "./rate-limit";
import {
  ANALYTICS_ORIGINS,
  ANALYTICS_RANGES,
  type AnalyticsOrigin,
  type AnalyticsPeriod,
  type AnalyticsRange,
} from "./types";

/**
 * null when the request may go on; otherwise the response to send back: 404 when
 * analytics is off, 401 without a session, 429 over the per-person request limit.
 */
export async function guardAnalytics(request: Request): Promise<Response | null> {
  const config = getAnalyticsConfig();
  if (config.status === "disabled") return Response.json({ error: "Not found" }, { status: 404 });
  const session = config.requiresSession ? await auth() : null;
  if (config.requiresSession && !session) {
    return Response.json({ error: "Inicia sesión para ver la analítica" }, { status: 401 });
  }
  // The person when there is login; the address otherwise (local development, previews).
  const key = session?.user?.email ?? request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "anonymous";
  const retryAfter = takeRequest(key);
  if (retryAfter > 0) {
    return Response.json(
      { error: "Demasiadas consultas seguidas. Espera un momento." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }
  return null;
}

/** WABAs of the Meta snapshot, by id: the only ones analytics may be asked about. */
export async function knownWabas(): Promise<Map<string, Waba>> {
  const { wabas } = await getTemplatesSnapshot();
  return new Map(wabas.map((w) => [w.waba_id, w]));
}

export function parseRange(value: string | null): AnalyticsRange {
  if (value && (ANALYTICS_RANGES as readonly string[]).includes(value)) return value as AnalyticsRange;
  throw new InvalidQueryParam("Periodo no válido");
}

/** `origin` defaults to every origin. */
export function parseOrigin(value: string | null): AnalyticsOrigin {
  if (!value) return "all";
  if ((ANALYTICS_ORIGINS as readonly string[]).includes(value)) return value as AnalyticsOrigin;
  throw new InvalidQueryParam("Origen no válido");
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;
const RANGE_DAYS: Record<AnalyticsRange, number | null> = { "7d": 7, "30d": 30, "90d": 90, all: null };
const dayMs = (day: string) => Date.parse(`${day}T00:00:00Z`);

/**
 * `from` and `to` (YYYY-MM-DD, `to` excluded), both or neither: only what the chart can
 * pick, so the combinations stay bounded. A day inside the range for 7, 30 and 90 days;
 * a week starting on Monday for "all".
 */
export function parsePeriod(
  from: string | null,
  to: string | null,
  range: AnalyticsRange,
  now = Date.now(),
): AnalyticsPeriod | null {
  if (!from && !to) return null;
  if (!from || !to || !ISO_DAY.test(from) || !ISO_DAY.test(to)) throw new InvalidQueryParam("Periodo no válido");
  const start = dayMs(from);
  const days = (dayMs(to) - start) / DAY_MS;
  const today = Math.floor(now / DAY_MS) * DAY_MS;
  const rangeDays = RANGE_DAYS[range];
  const valid =
    rangeDays === null
      ? days === 7 && new Date(start).getUTCDay() === 1 && start <= today
      : days === 1 && start >= today - rangeDays * DAY_MS && start <= today;
  if (!valid) throw new InvalidQueryParam("Periodo no válido");
  return { from, to };
}

/** Business data, per user: never cache it in the CDN or the browser beyond the session. */
export const PRIVATE_JSON = { "Cache-Control": "private, no-store" };

export function analyticsError(error: unknown): Response {
  if (error instanceof InvalidQueryParam) return Response.json({ error: error.message }, { status: 400 });
  if (error instanceof DataCloudError) return Response.json({ error: error.message }, { status: 502 });
  console.error(
    JSON.stringify({ event: "analytics_error", message: error instanceof Error ? error.message : String(error) }),
  );
  return Response.json({ error: "No se pudo cargar la analítica" }, { status: 500 });
}

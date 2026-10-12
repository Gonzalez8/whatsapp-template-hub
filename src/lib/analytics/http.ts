import { auth } from "@/auth";
import { DataCloudError } from "@/lib/datacloud";
import { getAnalyticsConfig } from "./config";
import { InvalidQueryParam } from "./queries";
import {
  ANALYTICS_ORIGINS,
  ANALYTICS_RANGES,
  type AnalyticsOrigin,
  type AnalyticsPeriod,
  type AnalyticsRange,
} from "./types";

/** null when the request may go on; otherwise the response to send back. */
export async function guardAnalytics(): Promise<Response | null> {
  const config = getAnalyticsConfig();
  if (config.status === "disabled") return Response.json({ error: "Not found" }, { status: 404 });
  if (config.requiresSession && !(await auth())) {
    return Response.json({ error: "Inicia sesión para ver la analítica" }, { status: 401 });
  }
  return null;
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
/** A day or a week: the only periods the chart lets you pick. */
const MAX_PERIOD_DAYS = 7;

/** `from` and `to` (YYYY-MM-DD, `to` excluded), both or neither. */
export function parsePeriod(from: string | null, to: string | null): AnalyticsPeriod | null {
  if (!from && !to) return null;
  if (!from || !to || !ISO_DAY.test(from) || !ISO_DAY.test(to)) throw new InvalidQueryParam("Periodo no válido");
  const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;
  if (!(days >= 1 && days <= MAX_PERIOD_DAYS)) throw new InvalidQueryParam("Periodo no válido");
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

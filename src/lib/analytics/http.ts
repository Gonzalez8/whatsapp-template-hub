import { auth } from "@/auth";
import { DataCloudError } from "@/lib/datacloud";
import { getAnalyticsConfig } from "./config";
import { InvalidQueryParam } from "./queries";
import { ANALYTICS_RANGES, type AnalyticsRange } from "./types";

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

import { getSummaryAnalytics } from "@/lib/analytics";
import {
  PRIVATE_JSON,
  analyticsError,
  guardAnalytics,
  knownWabas,
  parseOrigin,
  parsePeriod,
  parseRange,
} from "@/lib/analytics/http";
import { InvalidQueryParam } from "@/lib/analytics/queries";

/**
 * GET /api/analytics/summary?waba=<id>,<id>&range=30d[&origin=mce|de][&from=YYYY-MM-DD&to=YYYY-MM-DD]
 * All WABAs when `waba` is empty; `from`/`to` narrow it to one day or week.
 */
export async function GET(request: Request) {
  const denied = await guardAnalytics(request);
  if (denied) return denied;

  try {
    const params = new URL(request.url).searchParams;
    const range = parseRange(params.get("range"));
    const origin = parseOrigin(params.get("origin"));
    const period = parsePeriod(params.get("from"), params.get("to"), range);
    // Only WABAs of this Meta account: arbitrary ids would each open a new cache entry.
    const wabas = await knownWabas();
    let wabaIds = [...new Set((params.get("waba") ?? "").split(",").filter(Boolean))];
    if (wabaIds.some((id) => !wabas.has(id))) throw new InvalidQueryParam("WABA no válida");
    if (wabaIds.length === 0) {
      wabaIds = [...wabas.values()].filter((w) => w.templates.length > 0).map((w) => w.waba_id);
    }
    const data = await getSummaryAnalytics(wabaIds.sort(), range, origin, period);
    return Response.json(data, { headers: PRIVATE_JSON });
  } catch (error) {
    return analyticsError(error);
  }
}

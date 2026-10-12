import { getSummaryAnalytics } from "@/lib/analytics";
import {
  PRIVATE_JSON,
  analyticsError,
  guardAnalytics,
  parseOrigin,
  parsePeriod,
  parseRange,
} from "@/lib/analytics/http";
import { getTemplatesSnapshot } from "@/lib/templates";

/**
 * GET /api/analytics/summary?waba=<id>,<id>&range=30d[&origin=mce|de][&from=YYYY-MM-DD&to=YYYY-MM-DD]
 * All WABAs when `waba` is empty; `from`/`to` narrow it to one day or week.
 */
export async function GET(request: Request) {
  const denied = await guardAnalytics();
  if (denied) return denied;

  try {
    const params = new URL(request.url).searchParams;
    const range = parseRange(params.get("range"));
    const origin = parseOrigin(params.get("origin"));
    const period = parsePeriod(params.get("from"), params.get("to"));
    let wabaIds = (params.get("waba") ?? "").split(",").filter(Boolean);
    if (wabaIds.length === 0) {
      const { wabas } = await getTemplatesSnapshot();
      wabaIds = wabas.filter((w) => w.templates.length > 0).map((w) => w.waba_id);
    }
    const data = await getSummaryAnalytics([...new Set(wabaIds)].sort(), range, origin, period);
    return Response.json(data, { headers: PRIVATE_JSON });
  } catch (error) {
    return analyticsError(error);
  }
}

import { getSummaryAnalytics } from "@/lib/analytics";
import { PRIVATE_JSON, analyticsError, guardAnalytics, parseRange } from "@/lib/analytics/http";
import { getTemplatesSnapshot } from "@/lib/templates";

/** GET /api/analytics/summary?waba=<id>,<id>&range=30d — all WABAs when `waba` is empty. */
export async function GET(request: Request) {
  const denied = await guardAnalytics();
  if (denied) return denied;

  try {
    const params = new URL(request.url).searchParams;
    const range = parseRange(params.get("range"));
    let wabaIds = (params.get("waba") ?? "").split(",").filter(Boolean);
    if (wabaIds.length === 0) {
      const { wabas } = await getTemplatesSnapshot();
      wabaIds = wabas.filter((w) => w.templates.length > 0).map((w) => w.waba_id);
    }
    const data = await getSummaryAnalytics([...new Set(wabaIds)].sort(), range);
    return Response.json(data, { headers: PRIVATE_JSON });
  } catch (error) {
    return analyticsError(error);
  }
}

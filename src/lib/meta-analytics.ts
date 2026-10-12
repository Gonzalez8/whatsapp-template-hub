import { settleWithConcurrency } from "./concurrency";
import type { MetaVolume } from "./analytics/types";

const META_API = "https://graph.facebook.com/v23.0";
const FETCH_TIMEOUT_MS = 15_000;
const WABA_CONCURRENCY = 16;

interface PricingPoint {
  volume?: number;
  pricing_category?: string;
  pricing_type?: string;
}

async function wabaPricing(wabaId: string, start: number, end: number, token: string): Promise<PricingPoint[]> {
  const fields = `pricing_analytics.start(${start}).end(${end}).granularity(DAILY).dimensions(["PRICING_CATEGORY","PRICING_TYPE"])`;
  const res = await fetch(`${META_API}/${wabaId}?fields=${encodeURIComponent(fields)}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`pricing_analytics HTTP ${res.status}`);
  const body = await res.json();
  return body.pricing_analytics?.data?.[0]?.data_points ?? [];
}

/**
 * Free: anything in a free window (FREE_CUSTOMER_SERVICE, FREE_ENTRY_POINT) and every
 * service message. Meta doesn't charge for service (non-template) messages, but some
 * come back with pricing_type REGULAR, i.e. at the standard service rate, which is zero.
 */
function isFree(point: PricingPoint): boolean {
  return point.pricing_category === "SERVICE" || !!point.pricing_type?.startsWith("FREE");
}

/**
 * Messages Meta counted for the given WABAs between two instants (epoch seconds, at
 * day boundaries), by pricing category and paid/free. Counts every source, not only
 * Salesforce. Returns null if Meta can't be reached; WABAs that fail are left out.
 */
export async function fetchMetaVolume(wabaIds: string[], start: number, end: number): Promise<MetaVolume | null> {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token || wabaIds.length === 0) return null;

  const settled = await settleWithConcurrency(wabaIds, WABA_CONCURRENCY, (id) => wabaPricing(id, start, end, token));
  if (settled.every((r) => r.status === "rejected")) return null;

  const volume: MetaVolume = { total: 0, paid: 0, free: 0, byCategory: {} };
  for (const result of settled) {
    if (result.status !== "fulfilled") continue;
    for (const point of result.value) {
      const n = point.volume ?? 0;
      volume.total += n;
      if (isFree(point)) volume.free += n;
      else volume.paid += n;
      const category = point.pricing_category ?? "OTHER";
      volume.byCategory[category] = (volume.byCategory[category] ?? 0) + n;
    }
  }
  return volume;
}

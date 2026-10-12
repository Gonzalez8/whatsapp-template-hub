/**
 * Requests per person and minute to the analytics endpoints. Kept in the memory of each
 * server instance: it stops one person (or a script with their cookie) from sweeping
 * combinations, not a determined attacker spreading load over many instances.
 */
export const ANALYTICS_REQUESTS_PER_MINUTE = 60;
const WINDOW_MS = 60_000;
const MAX_KEYS = 5_000;

const hits = new Map<string, number[]>();

/** Records a request; returns the seconds to wait when over the limit, else 0. */
export function takeRequest(key: string, now = Date.now(), limit = ANALYTICS_REQUESTS_PER_MINUTE): number {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return Math.max(1, Math.ceil((recent[0] + WINDOW_MS - now) / 1000));
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > MAX_KEYS) hits.delete(hits.keys().next().value!);
  return 0;
}

/** For tests. */
export function resetRateLimit() {
  hits.clear();
}

// Shared by server and client: keep this module free of server-only imports.

/** How long the templates snapshot is served from cache before regenerating. */
export const TEMPLATES_REVALIDATE_SECONDS = 300;

/** Minimum age of the cached snapshot before a manual sync is allowed. */
export const SYNC_COOLDOWN_MS = 2 * 60 * 1000;

/**
 * Seconds left until a manual sync is allowed, given when the snapshot was fetched.
 * Clamped to the cooldown so a skewed client clock can never block the button longer.
 */
export function getRetryAfterSeconds(fetchedAt: number, now: number): number {
  const remaining = SYNC_COOLDOWN_MS - (now - fetchedAt);
  if (remaining <= 0) return 0;
  return Math.min(Math.ceil(remaining / 1000), SYNC_COOLDOWN_MS / 1000);
}

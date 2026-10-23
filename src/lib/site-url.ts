type Env = Record<string, string | undefined>;

/**
 * The app's public address, so link previews (Slack, Teams, WhatsApp…) get absolute image
 * URLs. `SITE_URL` when set; otherwise the origin of `AUTH_URL` (set with login) or, on
 * Vercel, the production domain. Undefined when none is known: previews just lack the image.
 */
export function getSiteUrl(env: Env = process.env): URL | undefined {
  const candidates = [
    env.SITE_URL,
    env.AUTH_URL,
    env.VERCEL_PROJECT_PRODUCTION_URL && `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`,
  ];
  for (const value of candidates) {
    try {
      if (value?.trim()) return new URL(new URL(value.trim()).origin);
    } catch {
      // Not a URL: try the next one.
    }
  }
  return undefined;
}

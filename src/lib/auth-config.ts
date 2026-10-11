type Env = Record<string, string | undefined>;

/** Variables Microsoft Entra ID login needs. Setting any of them turns login on. */
export const ENTRA_ENV_VARS = [
  "AUTH_MICROSOFT_ENTRA_ID_ID",
  "AUTH_MICROSOFT_ENTRA_ID_SECRET",
  "AUTH_MICROSOFT_ENTRA_ID_ISSUER",
] as const;

export type AuthConfig =
  /** No Entra variable set: the app stays open, as before login existed. */
  | { status: "disabled" }
  /** Some variables set, others missing: the app stays closed and says what is missing. */
  | { status: "incomplete"; missing: string[] }
  | { status: "enabled"; allowedEmails: string[] };

const has = (env: Env, name: string) => Boolean(env[name]?.trim());

/**
 * Whether Microsoft Entra ID login is on, from the environment. Login is opt-in:
 * it only applies once the Entra variables are configured in the deployment.
 */
export function getAuthConfig(env: Env = process.env): AuthConfig {
  if (!ENTRA_ENV_VARS.some((name) => has(env, name))) return { status: "disabled" };

  const missing = [...ENTRA_ENV_VARS, "AUTH_SECRET"].filter((name) => !has(env, name));
  if (missing.length > 0) return { status: "incomplete", missing };

  const allowedEmails = (env.AUTH_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return { status: "enabled", allowedEmails };
}

/** With no allowlist, every account of the Entra tenant gets in. */
export function isEmailAllowed(email: string | null | undefined, allowedEmails: string[]): boolean {
  if (allowedEmails.length === 0) return true;
  return !!email && allowedEmails.includes(email.trim().toLowerCase());
}

/** Only same-site paths are valid redirects after login (no open redirects). */
export function safeCallbackUrl(value: string | null | undefined): string {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : "/";
}

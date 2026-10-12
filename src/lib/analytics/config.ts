import { getAuthConfig } from "@/lib/auth-config";
import { getDataCloudConfig } from "@/lib/datacloud";

type Env = Record<string, string | undefined>;

export type AnalyticsConfig =
  | { status: "enabled"; requiresSession: boolean }
  /** No Salesforce credentials: analytics is simply not offered. */
  | { status: "disabled"; reason: "no-datacloud" }
  /** Credentials present but the app is open to anyone: business metrics stay hidden. */
  | { status: "disabled"; reason: "needs-login" };

/**
 * Analytics shows business data, so it only turns on behind login. The exceptions are
 * local development (`next dev`) and Vercel previews with ANALYTICS_WITHOUT_LOGIN=true,
 * meant for previews behind Vercel's Deployment Protection. Production always needs login.
 */
export function getAnalyticsConfig(env: Env = process.env): AnalyticsConfig {
  if (getDataCloudConfig(env).status === "disabled") return { status: "disabled", reason: "no-datacloud" };
  if (getAuthConfig(env).status === "enabled") return { status: "enabled", requiresSession: true };
  if (env.NODE_ENV === "development") return { status: "enabled", requiresSession: false };
  if (env.ANALYTICS_WITHOUT_LOGIN?.trim() === "true" && env.VERCEL_ENV === "preview") {
    return { status: "enabled", requiresSession: false };
  }
  return { status: "disabled", reason: "needs-login" };
}

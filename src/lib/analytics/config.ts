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
 * Analytics shows business data, so it only turns on behind login. The one exception
 * is local development (`next dev`), to be able to build and test it with real data.
 */
export function getAnalyticsConfig(env: Env = process.env): AnalyticsConfig {
  if (getDataCloudConfig(env).status === "disabled") return { status: "disabled", reason: "no-datacloud" };
  if (getAuthConfig(env).status === "enabled") return { status: "enabled", requiresSession: true };
  if (env.NODE_ENV === "development") return { status: "enabled", requiresSession: false };
  return { status: "disabled", reason: "needs-login" };
}

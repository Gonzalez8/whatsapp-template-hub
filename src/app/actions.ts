"use server";

import { auth } from "@/auth";
import { getAuthConfig } from "@/lib/auth-config";
import { requestTemplatesSync, type SyncResult } from "@/lib/templates";

export async function syncTemplates(): Promise<SyncResult> {
  // The middleware already guards the page; Server Actions are endpoints of their own,
  // so they check the session too.
  const authConfig = getAuthConfig();
  if (authConfig.status !== "disabled") {
    const session = authConfig.status === "enabled" ? await auth() : null;
    if (!session) {
      return { status: "error", message: "Tu sesión ha caducado. Recarga la página para volver a entrar." };
    }
  }
  return requestTemplatesSync();
}

"use server";

import { requestTemplatesSync, type SyncResult } from "@/lib/templates";

export async function syncTemplates(): Promise<SyncResult> {
  return requestTemplatesSync();
}

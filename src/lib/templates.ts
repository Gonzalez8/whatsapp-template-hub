import { revalidateTag, unstable_cache } from "next/cache";
import type { TemplatesSnapshot } from "@/types/template";
import { fetchWabasWithTemplates } from "./meta-api";
import { TEMPLATES_REVALIDATE_SECONDS, getRetryAfterSeconds } from "./sync-config";

export const TEMPLATES_TAG = "meta-templates";

/**
 * The Meta data, cached in the Next.js Data Cache (shared by every instance on
 * Vercel). Errors are never cached, so a failed regeneration keeps serving the
 * previous snapshot.
 */
export const getTemplatesSnapshot = unstable_cache(
  async (): Promise<TemplatesSnapshot> => ({
    wabas: await fetchWabasWithTemplates(),
    fetchedAt: Date.now(),
  }),
  ["templates-snapshot"],
  { revalidate: TEMPLATES_REVALIDATE_SECONDS, tags: [TEMPLATES_TAG] },
);

export type SyncResult = { success: true } | { success: false; retryAfterSeconds: number };

/**
 * Forces a fresh fetch from Meta unless the cached snapshot is younger than the
 * cooldown. The cooldown is based on the snapshot's own timestamp, so it holds
 * across instances and cold starts without extra infrastructure.
 */
export async function requestTemplatesSync(): Promise<SyncResult> {
  const { fetchedAt } = await getTemplatesSnapshot();
  const retryAfterSeconds = getRetryAfterSeconds(fetchedAt, Date.now());

  if (retryAfterSeconds > 0) {
    return { success: false, retryAfterSeconds };
  }

  revalidateTag(TEMPLATES_TAG);
  return { success: true };
}

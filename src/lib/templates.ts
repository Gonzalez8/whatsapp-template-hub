import { revalidateTag, unstable_cache } from "next/cache";
import type { TemplatesSnapshot } from "@/types/template";
import { fetchWabasWithTemplates } from "./meta-api";
import { TEMPLATES_REVALIDATE_SECONDS, getRetryAfterSeconds } from "./sync-config";

export const TEMPLATES_TAG = "meta-templates";

/**
 * The Meta data, cached in the Next.js Data Cache (shared by every instance on
 * Vercel). Errors are never cached: when the periodic regeneration fails, the
 * previous snapshot keeps being served. After a manual sync (revalidateTag) the
 * entry is gone, so if Meta fails right then the page shows error.tsx until the
 * next successful fetch.
 */
export const getTemplatesSnapshot = unstable_cache(
  async (): Promise<TemplatesSnapshot> => ({
    wabas: await fetchWabasWithTemplates(),
    fetchedAt: Date.now(),
  }),
  ["templates-snapshot"],
  { revalidate: TEMPLATES_REVALIDATE_SECONDS, tags: [TEMPLATES_TAG] },
);

export type SyncResult =
  | { status: "ok" }
  | { status: "cooldown"; retryAfterSeconds: number }
  | { status: "error"; message: string };

/**
 * Forces a fresh fetch from Meta unless the cached snapshot is younger than the
 * cooldown. The cooldown is based on the snapshot's own timestamp, so it holds
 * across instances and cold starts without extra infrastructure.
 *
 * Never throws: callers get an explicit result for every outcome. The check is
 * not atomic, so two syncs in the same instant may both regenerate; acceptable
 * for this tool (at most one extra fetch) and not worth a distributed lock.
 */
export async function requestTemplatesSync(): Promise<SyncResult> {
  let fetchedAt: number;
  try {
    // Normally a cache hit. On an empty cache this fetches from Meta, which may fail.
    ({ fetchedAt } = await getTemplatesSnapshot());
  } catch (e) {
    console.error(JSON.stringify({ event: "sync_failed", message: e instanceof Error ? e.message : String(e) }));
    return { status: "error", message: "No se pudo conectar con Meta. Inténtalo de nuevo en unos minutos." };
  }

  const retryAfterSeconds = getRetryAfterSeconds(fetchedAt, Date.now());
  if (retryAfterSeconds > 0) {
    return { status: "cooldown", retryAfterSeconds };
  }

  revalidateTag(TEMPLATES_TAG);
  return { status: "ok" };
}

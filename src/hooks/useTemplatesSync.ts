import { useCallback, useEffect, useState } from "react";
import { syncTemplates } from "@/app/actions";
import { SYNC_COOLDOWN_MS, getRetryAfterSeconds } from "@/lib/sync-config";

const SYNC_COOLDOWN_S = SYNC_COOLDOWN_MS / 1000;

/** State of the "Sincronizar" button: running, seconds of cooldown left and last error. */
export function useTemplatesSync(fetchedAt: number) {
  const [syncing, setSyncing] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // The server rejects syncs while the snapshot is fresh; mirror that on load so
  // the button is already disabled right after anyone synced.
  useEffect(() => {
    setCooldown(getRetryAfterSeconds(fetchedAt, Date.now()));
  }, [fetchedAt]);

  const coolingDown = cooldown > 0;
  useEffect(() => {
    if (!coolingDown) return;
    const id = setInterval(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(id);
  }, [coolingDown]);

  // The action's response already carries the re-rendered page (revalidateTag),
  // so no router.refresh() is needed after a successful sync.
  const sync = useCallback(async () => {
    setSyncing(true);
    setError(null);
    try {
      const result = await syncTemplates();
      if (result.status === "cooldown") {
        setCooldown(result.retryAfterSeconds);
      } else {
        // Also back off after an error so retries don't hammer Meta.
        setCooldown(SYNC_COOLDOWN_S);
        if (result.status === "error") setError(result.message);
      }
    } catch {
      // Network failure or the server action itself crashed.
      setCooldown(SYNC_COOLDOWN_S);
      setError("No se pudo sincronizar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setSyncing(false);
    }
  }, []);

  return { syncing, cooldown, error, sync };
}

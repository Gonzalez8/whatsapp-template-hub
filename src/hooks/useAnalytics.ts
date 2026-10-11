import { useEffect, useState } from "react";

type State<T> = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: T };

// Per page load: switching back to a WABA or template already seen is instant.
const cache = new Map<string, unknown>();

/** Loads an analytics endpoint; `url` null means nothing to load yet. */
export function useAnalytics<T>(url: string | null): State<T> {
  const [state, setState] = useState<State<T>>(() =>
    url && cache.has(url) ? { status: "ready", data: cache.get(url) as T } : { status: "loading" },
  );

  useEffect(() => {
    if (!url) return;
    if (cache.has(url)) {
      setState({ status: "ready", data: cache.get(url) as T });
      return;
    }
    const controller = new AbortController();
    setState({ status: "loading" });
    fetch(url, { signal: controller.signal })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? "No se pudo cargar la analítica");
        cache.set(url, body);
        setState({ status: "ready", data: body as T });
      })
      .catch((error: Error) => {
        if (error.name !== "AbortError") setState({ status: "error", message: error.message });
      });
    return () => controller.abort();
  }, [url]);

  return state;
}

/** For tests. */
export function clearAnalyticsCache() {
  cache.clear();
}

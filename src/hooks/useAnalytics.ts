import { useEffect, useState } from "react";

type State<T> = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: T };

// Per page load: switching back to a WABA or template already seen is instant.
const cache = new Map<string, unknown>();
// Requests in flight, so two parts of the screen asking for the same data share one fetch.
const pending = new Map<string, Promise<unknown>>();

function load(url: string): Promise<unknown> {
  let request = pending.get(url);
  if (!request) {
    request = fetch(url)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? "No se pudo cargar la analítica");
        cache.set(url, body);
        return body;
      })
      .finally(() => pending.delete(url));
    pending.set(url, request);
  }
  return request;
}

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
    let active = true;
    setState({ status: "loading" });
    load(url)
      .then((body) => active && setState({ status: "ready", data: body as T }))
      .catch((error: Error) => active && setState({ status: "error", message: error.message }));
    return () => {
      active = false;
    };
  }, [url]);

  return state;
}

/** For tests. */
export function clearAnalyticsCache() {
  cache.clear();
  pending.clear();
}

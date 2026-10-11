import { useSyncExternalStore } from "react";

/**
 * Whether a media query matches. The server (and browsers without matchMedia) get
 * `serverValue`, so the prerendered HTML is the desktop layout.
 */
export function useMediaQuery(query: string, serverValue = true): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => (window.matchMedia ? window.matchMedia(query).matches : serverValue),
    () => serverValue,
  );
}

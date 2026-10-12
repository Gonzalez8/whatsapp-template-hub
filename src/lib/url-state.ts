import { ANALYTICS_ORIGINS, ANALYTICS_RANGES, type AnalyticsOrigin, type AnalyticsRange } from "@/lib/analytics/types";

export type ViewMode = "list" | "gallery" | "compare" | "analytics";

/** At most this many templates side by side. */
export const MAX_COMPARE = 4;

export interface DashboardUrlState {
  search: string;
  wabas: string[];
  statuses: string[];
  languages: string[];
  categories: string[];
  hideSamples: boolean;
  view: ViewMode;
  /** Selected template id. */
  template: string | null;
  /** Template ids being compared. */
  compare: string[];
  /** Period of the analytics view. */
  range: AnalyticsRange;
  /** Origin filter of the analytics view. */
  origin: AnalyticsOrigin;
  /** Day (or Monday of the week, in "all") picked on the analytics chart. */
  day: string | null;
  /** Open tab of the template detail. */
  tab: DetailTabId;
}

export const DETAIL_TABS = ["preview", "variables", "buttons", "info", "analytics"] as const;
export type DetailTabId = (typeof DETAIL_TABS)[number];

export const DEFAULT_URL_STATE: DashboardUrlState = {
  search: "",
  wabas: [],
  statuses: [],
  languages: [],
  categories: [],
  hideSamples: true,
  view: "list",
  template: null,
  compare: [],
  range: "30d",
  origin: "all",
  day: null,
  tab: "preview",
};

// Old links with view=all (the previous gallery) open the new one.
const VIEW_PARAM: Record<string, ViewMode> = {
  gallery: "gallery",
  all: "gallery",
  compare: "compare",
  analytics: "analytics",
};

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const oneOf = <T extends string>(options: readonly T[], value: string | null, fallback: T): T =>
  (options as readonly string[]).includes(value ?? "") ? (value as T) : fallback;

const list = (value: string | null) => (value ? value.split(",").filter(Boolean) : []);

export function parseUrlState(search: string): DashboardUrlState {
  const p = new URLSearchParams(search);
  return {
    search: p.get("q") ?? "",
    wabas: list(p.get("waba")),
    statuses: list(p.get("status")),
    languages: list(p.get("lang")),
    categories: list(p.get("cat")),
    hideSamples: p.get("samples") !== "1",
    view: VIEW_PARAM[p.get("view") ?? ""] ?? "list",
    template: p.get("t") || null,
    compare: list(p.get("cmp")).slice(0, MAX_COMPARE),
    range: oneOf(ANALYTICS_RANGES, p.get("range"), DEFAULT_URL_STATE.range),
    origin: oneOf(ANALYTICS_ORIGINS, p.get("origin"), DEFAULT_URL_STATE.origin),
    day: ISO_DAY.test(p.get("day") ?? "") ? p.get("day") : null,
    tab: oneOf(DETAIL_TABS, p.get("tab"), DEFAULT_URL_STATE.tab),
  };
}

/** Query string (without "?") with only the non-default values, so clean URLs stay clean. */
export function serializeUrlState(state: DashboardUrlState): string {
  const p = new URLSearchParams();
  if (state.search.trim()) p.set("q", state.search.trim());
  if (state.wabas.length) p.set("waba", state.wabas.join(","));
  if (state.statuses.length) p.set("status", state.statuses.join(","));
  if (state.languages.length) p.set("lang", state.languages.join(","));
  if (state.categories.length) p.set("cat", state.categories.join(","));
  if (!state.hideSamples) p.set("samples", "1");
  if (state.view !== "list") p.set("view", state.view);
  if (state.template) p.set("t", state.template);
  if (state.compare.length) p.set("cmp", state.compare.join(","));
  if (state.view === "analytics") {
    if (state.range !== DEFAULT_URL_STATE.range) p.set("range", state.range);
    if (state.origin !== DEFAULT_URL_STATE.origin) p.set("origin", state.origin);
    if (state.day) p.set("day", state.day);
  }
  if (state.template && state.tab !== DEFAULT_URL_STATE.tab) p.set("tab", state.tab);
  return p.toString();
}

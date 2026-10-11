export type ViewMode = "list" | "gallery" | "compare";

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
}

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
};

// Old links with view=all (the previous gallery) open the new one.
const VIEW_PARAM: Record<string, ViewMode> = { gallery: "gallery", all: "gallery", compare: "compare" };

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
  return p.toString();
}

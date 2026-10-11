export type ViewMode = "list" | "all";

export interface DashboardUrlState {
  search: string;
  wabas: string[];
  statuses: string[];
  languages: string[];
  categories: string[];
  hideSamples: boolean;
  view: ViewMode;
  /** Selected template id (list view). */
  template: string | null;
}

export const DEFAULT_URL_STATE: DashboardUrlState = {
  search: "",
  wabas: [],
  statuses: [],
  languages: [],
  categories: [],
  hideSamples: true,
  view: "all",
  template: null,
};

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
    view: p.get("view") === "list" ? "list" : "all",
    template: p.get("t") || null,
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
  if (state.view === "list") p.set("view", "list");
  if (state.view === "list" && state.template) p.set("t", state.template);
  return p.toString();
}

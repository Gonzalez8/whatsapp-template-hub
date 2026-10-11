import { useState, useMemo, useCallback, useEffect } from "react";
import type { Waba, TemplateStatus } from "@/types/template";
import { buildSearchText, matchesTerms, parseQuery } from "@/lib/search";

export interface FilterState {
  search: string;
  wabas: string[];
  statuses: TemplateStatus[];
  languages: string[];
  categories: string[];
  hideSamples: boolean;
}

export function useTemplateFilters(wabas: Waba[]) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedWabas, setSelectedWabas] = useState<Set<string>>(new Set());
  const [selectedStatuses, setSelectedStatuses] = useState<Set<TemplateStatus>>(new Set());
  const [selectedLanguages, setSelectedLanguages] = useState<Set<string>>(new Set());

  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

  const [hideSamples, setHideSamples] = useState(true);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 150);
    return () => clearTimeout(id);
  }, [search]);

  /** Replaces every filter at once (e.g. from the URL), skipping the search debounce. */
  const replaceFilters = useCallback((state: FilterState) => {
    setSearch(state.search);
    setDebouncedSearch(state.search);
    setSelectedWabas(new Set(state.wabas));
    setSelectedStatuses(new Set(state.statuses));
    setSelectedLanguages(new Set(state.languages));
    setSelectedCategories(new Set(state.categories));
    setHideSamples(state.hideSamples);
  }, []);

  // Built once per data load: normalized text of everything a template can be found by.
  const searchIndex = useMemo(() => {
    const index = new Map<string, string>();
    for (const w of wabas) {
      for (const t of w.templates) index.set(t.id, buildSearchText(t, w.waba_name));
    }
    return index;
  }, [wabas]);

  const searchTerms = useMemo(() => parseQuery(debouncedSearch), [debouncedSearch]);

  const allLanguages = useMemo(() => {
    const langs = new Set<string>();
    for (const w of wabas) {
      for (const t of w.templates) {
        if (t.language) langs.add(t.language);
      }
    }
    return Array.from(langs).sort();
  }, [wabas]);

  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    for (const w of wabas) {
      for (const t of w.templates) {
        if (t.category) cats.add(t.category);
      }
    }
    return Array.from(cats).sort();
  }, [wabas]);

  const toggleWaba = useCallback((id: string) => {
    setSelectedWabas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleStatus = useCallback((status: TemplateStatus) => {
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }, []);

  const toggleCategory = useCallback((cat: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  const toggleLanguage = useCallback((lang: string) => {
    setSelectedLanguages((prev) => {
      const next = new Set(prev);
      if (next.has(lang)) next.delete(lang);
      else next.add(lang);
      return next;
    });
  }, []);

  const clearWabas = useCallback(() => setSelectedWabas(new Set()), []);
  const selectOnlyWaba = useCallback((id: string) => setSelectedWabas(new Set([id])), []);

  const allStatuses = useMemo(() => {
    const statuses = new Set<TemplateStatus>();
    for (const w of wabas) for (const t of w.templates) statuses.add(t.status);
    return Array.from(statuses).sort();
  }, [wabas]);

  // Every filter except the WABA one: the sidebar shows these counts for all WABAs,
  // so you can see where the matches are before selecting them.
  const matching = useMemo(
    () =>
      wabas.map((w) => ({
        ...w,
        templates: w.templates.filter((t) => {
          if (hideSamples && t.name.startsWith("sample_")) return false;
          if (selectedStatuses.size > 0 && !selectedStatuses.has(t.status)) return false;
          if (selectedLanguages.size > 0 && !selectedLanguages.has(t.language)) return false;
          if (selectedCategories.size > 0 && !selectedCategories.has(t.category)) return false;
          return matchesTerms(searchIndex.get(t.id) ?? "", searchTerms);
        }),
      })),
    [wabas, searchIndex, searchTerms, selectedStatuses, selectedLanguages, selectedCategories, hideSamples],
  );

  const countsByWaba = useMemo(() => new Map(matching.map((w) => [w.waba_id, w.templates.length])), [matching]);

  const filtered = useMemo(
    () => matching.filter((w) => w.templates.length > 0 && (selectedWabas.size === 0 || selectedWabas.has(w.waba_id))),
    [matching, selectedWabas],
  );

  const totalTemplates = useMemo(() => filtered.reduce((sum, w) => sum + w.templates.length, 0), [filtered]);

  return {
    search,
    setSearch,
    debouncedSearch,
    searchTerms,
    replaceFilters,
    selectedWabas,
    toggleWaba,
    clearWabas,
    selectOnlyWaba,
    countsByWaba,
    allStatuses,
    selectedStatuses,
    toggleStatus,
    allLanguages,
    selectedLanguages,
    toggleLanguage,
    allCategories,
    selectedCategories,
    toggleCategory,
    hideSamples,
    setHideSamples,
    filtered,
    totalTemplates,
  };
}

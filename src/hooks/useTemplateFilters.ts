import { useState, useMemo, useCallback } from "react";
import type { Waba, TemplateStatus } from "@/types/template";

export function useTemplateFilters(wabas: Waba[]) {
  const [search, setSearch] = useState("");
  const [selectedWabas, setSelectedWabas] = useState<Set<string>>(new Set());
  const [selectedStatuses, setSelectedStatuses] = useState<Set<TemplateStatus>>(
    new Set()
  );
  const [selectedLanguages, setSelectedLanguages] = useState<Set<string>>(
    new Set()
  );

  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set()
  );

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

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();

    return wabas
      .filter((w) => selectedWabas.size === 0 || selectedWabas.has(w.waba_id))
      .map((w) => {
        const templates = w.templates.filter((t) => {
          if (selectedStatuses.size > 0 && !selectedStatuses.has(t.status))
            return false;
          if (selectedLanguages.size > 0 && !selectedLanguages.has(t.language))
            return false;
          if (selectedCategories.size > 0 && !selectedCategories.has(t.category))
            return false;
          if (!q) return true;
          const bodyComp = t.components?.find((c) => c.type === "BODY");
          const bodyText = bodyComp?.text ?? "";
          return (
            t.name.toLowerCase().includes(q) ||
            bodyText.toLowerCase().includes(q) ||
            t.language?.toLowerCase().includes(q) ||
            t.category?.toLowerCase().includes(q)
          );
        });
        return { ...w, templates };
      })
      .filter((w) => w.templates.length > 0);
  }, [wabas, search, selectedWabas, selectedStatuses, selectedLanguages, selectedCategories]);

  const totalTemplates = useMemo(
    () => filtered.reduce((sum, w) => sum + w.templates.length, 0),
    [filtered]
  );

  return {
    search,
    setSearch,
    selectedWabas,
    toggleWaba,
    selectedStatuses,
    toggleStatus,
    allLanguages,
    selectedLanguages,
    toggleLanguage,
    allCategories,
    selectedCategories,
    toggleCategory,
    filtered,
    totalTemplates,
  };
}

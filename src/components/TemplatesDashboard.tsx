"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Template, Waba } from "@/types/template";
import { useTemplateFilters } from "@/hooks/useTemplateFilters";
import { useTemplatesSync } from "@/hooks/useTemplatesSync";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { groupByName, pickVariant, type TemplateFamily } from "@/lib/template-groups";
import { MAX_COMPARE, parseUrlState, serializeUrlState, type ViewMode } from "@/lib/url-state";
import { SearchTermsProvider } from "./Highlight";
import { TopBar } from "./TopBar";
import { WabaSidebar } from "./WabaSidebar";
import { ListToolbar } from "./ListToolbar";
import { TemplateList } from "./TemplateList";
import { DetailPanel } from "./DetailPanel";
import { CompareView } from "./CompareView";
import { GalleryView } from "./GalleryView";
import { EmptyState } from "./EmptyState";

interface TemplatesDashboardProps {
  wabas: Waba[];
  fetchedAt: number;
  brand?: { name?: string; logoUrl?: string };
}

/** A mobile overlay sliding up from the bottom; on desktop the same content lives inline. */
function MobileSheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      className="fixed inset-0 z-50 lg:hidden"
    >
      <div className="fade-in-enter bg-ink/40 absolute inset-0" onClick={onClose} />
      <div className="slide-up-enter bg-surface absolute inset-x-0 top-10 bottom-0 flex flex-col overflow-hidden rounded-t-2xl shadow-2xl">
        <div className="border-line flex shrink-0 items-center justify-between border-b px-3 py-1.5">
          <span className="pl-1 text-sm font-semibold">{title}</span>
          <button
            type="button"
            onClick={onClose}
            className="text-accent-ink flex min-h-[44px] items-center rounded-lg px-3 text-sm font-medium"
          >
            Cerrar
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function TemplatesDashboard({ wabas, fetchedAt, brand = {} }: TemplatesDashboardProps) {
  const filters = useTemplateFilters(wabas);
  const { filtered, searchTerms, debouncedSearch, selectedWabas, replaceFilters } = filters;
  const sync = useTemplatesSync(fetchedAt);
  // Detail and WABA filter are mounted once: inline on desktop, as a sheet on mobile.
  // The prerendered HTML is the desktop layout; its lg: classes hide it on mobile until hydration.
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const [view, setView] = useState<ViewMode>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Language of the last template opened: moving to another template keeps it when possible.
  const [language, setLanguage] = useState<string | undefined>(undefined);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [wabaSheetOpen, setWabaSheetOpen] = useState(false);

  // Every template by id, regardless of filters (comparisons survive filter changes).
  const index = useMemo(() => {
    const map = new Map<string, { template: Template; waba: Waba }>();
    for (const waba of wabas) for (const template of waba.templates) map.set(template.id, { template, waba });
    return map;
  }, [wabas]);

  // ── URL state: filters, view, selection and comparison live in the query string so
  // any screen can be shared as a link. Read after mount (the page is prerendered
  // without query params) and written back with replaceState (no navigation).
  const [urlReady, setUrlReady] = useState(false);

  useEffect(() => {
    const url = parseUrlState(window.location.search);
    replaceFilters({
      search: url.search,
      wabas: url.wabas,
      statuses: url.statuses.filter((s) => filters.allStatuses.includes(s)),
      languages: url.languages,
      categories: url.categories,
      hideSamples: url.hideSamples,
    });
    setView(url.view);
    const selected = url.template ? index.get(url.template) : undefined;
    if (selected) {
      setSelectedId(selected.template.id);
      setLanguage(selected.template.language);
    }
    setCompareIds(url.compare.filter((id) => index.has(id)));
    setUrlReady(true);
  }, [replaceFilters, index, filters.allStatuses]);

  useEffect(() => {
    if (!urlReady) return;
    const query = serializeUrlState({
      search: debouncedSearch,
      wabas: [...selectedWabas],
      statuses: [...filters.selectedStatuses],
      languages: [...filters.selectedLanguages],
      categories: [...filters.selectedCategories],
      hideSamples: filters.hideSamples,
      view,
      template: selectedId,
      compare: compareIds,
    });
    const next = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    if (next !== window.location.pathname + window.location.search) {
      window.history.replaceState(null, "", next);
    }
  }, [
    urlReady,
    debouncedSearch,
    selectedWabas,
    filters.selectedStatuses,
    filters.selectedLanguages,
    filters.selectedCategories,
    filters.hideSamples,
    view,
    selectedId,
    compareIds,
  ]);

  // ── Selection
  const visibleWabaByTemplate = useMemo(() => {
    const map = new Map<string, Waba>();
    for (const w of filtered) for (const t of w.templates) map.set(t.id, w);
    return map;
  }, [filtered]);

  const selected = selectedId ? index.get(selectedId) : undefined;
  const selectedWaba = selectedId ? visibleWabaByTemplate.get(selectedId) : undefined;

  // Close the selection when the filters hide it.
  useEffect(() => {
    if (selectedId && urlReady && !visibleWabaByTemplate.has(selectedId)) {
      setSelectedId(null);
      setMobileDetailOpen(false);
    }
  }, [selectedId, urlReady, visibleWabaByTemplate]);

  const variants = useMemo(
    () =>
      selected && selectedWaba
        ? selectedWaba.templates
            .filter((t) => t.name === selected.template.name)
            .sort((a, b) => a.language.localeCompare(b.language))
        : [],
    [selected, selectedWaba],
  );

  const select = useCallback((template: Template, openOnMobile = true) => {
    setSelectedId(template.id);
    setLanguage(template.language);
    if (openOnMobile) setMobileDetailOpen(true);
  }, []);

  // Families in the same order the list shows them, for keyboard navigation.
  const families = useMemo(() => filtered.flatMap((w) => groupByName(w.templates)), [filtered]);

  // ↑/↓ move through the list (also while typing in the search box).
  useEffect(() => {
    if (view !== "list") return;
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.key !== "ArrowDown" && e.key !== "ArrowUp") || e.altKey || e.metaKey || e.ctrlKey) return;
      const target = e.target as HTMLElement | null;
      const inOtherField =
        target && target.id !== "template-search" && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if (inOtherField || families.length === 0) return;

      e.preventDefault();
      const current = families.findIndex((f) => f.variants.some((v) => v.id === selectedId));
      const step = e.key === "ArrowDown" ? 1 : -1;
      const next =
        current === -1
          ? step === 1
            ? 0
            : families.length - 1
          : Math.min(families.length - 1, Math.max(0, current + step));
      select(pickVariant(families[next], language), false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [view, families, selectedId, language, select]);

  // ── Comparison
  const compareSet = useMemo(() => new Set(compareIds), [compareIds]);
  const compareFull = compareIds.length >= MAX_COMPARE;

  const toggleCompareFamily = useCallback(
    (family: TemplateFamily) => {
      setCompareIds((prev) => {
        if (family.variants.some((v) => prev.includes(v.id))) {
          return prev.filter((id) => !family.variants.some((v) => v.id === id));
        }
        if (prev.length >= MAX_COMPARE) return prev;
        const variant = family.variants.find((v) => v.id === selectedId) ?? pickVariant(family, language);
        return [...prev, variant.id];
      });
    },
    [selectedId, language],
  );

  const toggleCompareTemplate = useCallback((id: string) => {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < MAX_COMPARE ? [...prev, id] : prev,
    );
  }, []);

  const compareItems = useMemo(
    () =>
      compareIds.flatMap((id) => {
        const entry = index.get(id);
        return entry ? [{ template: entry.template, wabaName: entry.waba.waba_name }] : [];
      }),
    [compareIds, index],
  );

  const openCompare = useCallback(() => {
    setView("compare");
    setMobileDetailOpen(false);
  }, []);

  const openAllKey = [debouncedSearch.trim(), [...selectedWabas].sort().join(",")].filter(Boolean).join("|");

  const detail = (
    <DetailPanel
      template={selected && selectedWaba ? selected.template : null}
      wabaId={selectedWaba?.waba_id ?? null}
      wabaName={selectedWaba?.waba_name ?? ""}
      variants={variants}
      onSelectVariant={(t) => select(t, false)}
      compared={!!selectedId && compareSet.has(selectedId)}
      compareDisabled={compareFull && !(selectedId && compareSet.has(selectedId))}
      onToggleCompare={() => selectedId && toggleCompareTemplate(selectedId)}
      onCompareLanguages={() => {
        setCompareIds(variants.slice(0, MAX_COMPARE).map((v) => v.id));
        openCompare();
      }}
    />
  );

  const sidebar = (
    <WabaSidebar
      wabas={wabas}
      counts={filters.countsByWaba}
      selected={selectedWabas}
      onToggle={filters.toggleWaba}
      onOnly={filters.selectOnlyWaba}
      onClear={filters.clearWabas}
    />
  );

  return (
    <SearchTermsProvider value={searchTerms}>
      <div className="flex h-dvh flex-col">
        <TopBar
          search={filters.search}
          onSearchChange={filters.setSearch}
          fetchedAt={fetchedAt}
          syncing={sync.syncing}
          cooldown={sync.cooldown}
          syncError={sync.error}
          onSync={sync.sync}
          view={view === "compare" ? null : view}
          brand={brand}
          onViewChange={setView}
        />

        <div className="flex min-h-0 flex-1">
          {isDesktop && (
            <aside aria-label="Filtrar por WABA" className="bg-side hidden w-[272px] shrink-0 lg:block">
              {sidebar}
            </aside>
          )}

          {view === "compare" ? (
            <main className="min-w-0 flex-1">
              <CompareView
                items={compareItems}
                onRemove={toggleCompareTemplate}
                onClear={() => setCompareIds([])}
                onBack={() => setView("list")}
              />
            </main>
          ) : (
            <>
              <section
                aria-label="Plantillas"
                className={`bg-surface flex min-w-0 flex-1 flex-col ${
                  view === "list" ? "border-line border-r lg:max-w-[500px] xl:max-w-[560px]" : ""
                }`}
              >
                <ListToolbar
                  wabas={wabas}
                  selectedWabas={selectedWabas}
                  onToggleWaba={filters.toggleWaba}
                  onClearWabas={filters.clearWabas}
                  onOpenWabas={() => setWabaSheetOpen(true)}
                  allStatuses={filters.allStatuses}
                  selectedStatuses={filters.selectedStatuses}
                  onToggleStatus={filters.toggleStatus}
                  allCategories={filters.allCategories}
                  selectedCategories={filters.selectedCategories}
                  onToggleCategory={filters.toggleCategory}
                  allLanguages={filters.allLanguages}
                  selectedLanguages={filters.selectedLanguages}
                  onToggleLanguage={filters.toggleLanguage}
                  hideSamples={filters.hideSamples}
                  onToggleHideSamples={() => filters.setHideSamples((h) => !h)}
                  totalTemplates={filters.totalTemplates}
                  totalWabas={filtered.length}
                />

                <div className="min-h-0 flex-1">
                  {filtered.length === 0 ? (
                    <EmptyState />
                  ) : view === "gallery" ? (
                    <GalleryView
                      wabas={filtered}
                      onOpen={(t) => {
                        setView("list");
                        select(t);
                      }}
                      compareIds={compareSet}
                      compareFull={compareFull}
                      onToggleCompare={toggleCompareTemplate}
                    />
                  ) : (
                    <TemplateList
                      wabas={filtered}
                      selectedId={selectedId}
                      preferredLanguage={language}
                      onSelect={select}
                      compareIds={compareSet}
                      compareFull={compareFull}
                      onToggleCompare={toggleCompareFamily}
                      openAllKey={openAllKey}
                    />
                  )}
                </div>

                {compareIds.length > 0 && (
                  <div className="bg-chrome text-chrome-ink flex shrink-0 items-center gap-3 px-4 py-2.5">
                    <span className="flex-1 text-[13px]">
                      {compareIds.length} {compareIds.length === 1 ? "plantilla" : "plantillas"} para comparar
                      {compareFull && <span className="text-white/60"> · máximo {MAX_COMPARE}</span>}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCompareIds([])}
                      className="text-xs text-white/80 hover:text-white hover:underline"
                    >
                      Vaciar
                    </button>
                    <button
                      type="button"
                      onClick={openCompare}
                      disabled={compareIds.length < 2}
                      title={compareIds.length < 2 ? "Añade al menos dos plantillas" : undefined}
                      className="bg-accent text-on-accent h-8 rounded-lg px-3 text-[13px] font-semibold hover:brightness-95 disabled:opacity-50"
                    >
                      Comparar →
                    </button>
                  </div>
                )}
              </section>

              {isDesktop && view === "list" && (
                <main className="hidden min-w-0 flex-1 overflow-y-auto lg:block">{detail}</main>
              )}
            </>
          )}
        </div>
      </div>

      {!isDesktop && view === "list" && mobileDetailOpen && selected && selectedWaba && (
        <MobileSheet title="Detalle de la plantilla" onClose={() => setMobileDetailOpen(false)}>
          {detail}
        </MobileSheet>
      )}

      {!isDesktop && wabaSheetOpen && (
        <MobileSheet title="Filtrar por WABA" onClose={() => setWabaSheetOpen(false)}>
          {sidebar}
        </MobileSheet>
      )}
    </SearchTermsProvider>
  );
}

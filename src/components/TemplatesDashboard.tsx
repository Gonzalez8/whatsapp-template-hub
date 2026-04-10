"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Waba, Template } from "@/types/template";
import { useTemplateFilters } from "@/hooks/useTemplateFilters";
import { syncTemplates } from "@/app/actions";
import { FiltersBar } from "./FiltersBar";
import { WabaSection } from "./WabaSection";
import { TemplateList } from "./TemplateList";
import { DetailPanel } from "./DetailPanel";
import { EmptyState } from "./EmptyState";

const SYNC_COOLDOWN_S = 120;

type ViewMode = "list" | "all";

interface TemplatesDashboardProps {
  wabas: Waba[];
}

export function TemplatesDashboard({ wabas }: TemplatesDashboardProps) {
  const {
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
    hideSamples,
    setHideSamples,
    filtered,
    totalTemplates,
  } = useTemplateFilters(wabas);

  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedWabaId, setSelectedWabaId] = useState<string | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  const isCoolingDown = cooldown > 0;

  useEffect(() => {
    if (!isCoolingDown) return;
    const id = setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [isCoolingDown]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      const result = await syncTemplates();
      if (!result.success) {
        setCooldown(result.retryAfterSeconds ?? SYNC_COOLDOWN_S);
      } else {
        setCooldown(SYNC_COOLDOWN_S);
        router.refresh();
      }
    } finally {
      setSyncing(false);
    }
  }, [router]);

  const handleSelect = useCallback((templateId: string, wabaId: string) => {
    setSelectedId(templateId);
    setSelectedWabaId(wabaId);
    // Open mobile detail overlay when selecting in list mode
    setMobileDetailOpen(true);
  }, []);

  const handleMobileDetailClose = useCallback(() => {
    setMobileDetailOpen(false);
  }, []);

  // Lock body scroll when mobile detail overlay is open
  useEffect(() => {
    if (mobileDetailOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileDetailOpen]);

  const selectedTemplate = useMemo((): Template | null => {
    if (!selectedId) return null;
    for (const w of filtered) {
      const t = w.templates.find((t) => t.id === selectedId);
      if (t) return t;
    }
    return null;
  }, [selectedId, filtered]);

  const selectedWabaName = useMemo(() => {
    if (!selectedWabaId) return "";
    return wabas.find((w) => w.waba_id === selectedWabaId)?.waba_name ?? "";
  }, [selectedWabaId, wabas]);

  // Close selection if template is filtered out
  useEffect(() => {
    if (selectedId && !selectedTemplate) {
      setSelectedId(null);
      setMobileDetailOpen(false);
    }
  }, [selectedId, selectedTemplate]);

  return (
    <>
      <FiltersBar
        search={search}
        onSearchChange={setSearch}
        wabas={wabas}
        selectedWabas={selectedWabas}
        onToggleWaba={toggleWaba}
        selectedStatuses={selectedStatuses}
        onToggleStatus={toggleStatus}
        allLanguages={allLanguages}
        selectedLanguages={selectedLanguages}
        onToggleLanguage={toggleLanguage}
        allCategories={allCategories}
        selectedCategories={selectedCategories}
        onToggleCategory={toggleCategory}
        hideSamples={hideSamples}
        onToggleHideSamples={() => setHideSamples((h) => !h)}
      />

      <div className="mt-6 mb-6 flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        <p className="text-xs font-medium text-gray-500 sm:text-[13px]">
          Mostrando <strong className="font-display font-bold text-gray-900">{totalTemplates}</strong> templates en{" "}
          <strong className="font-display font-bold text-gray-900">{filtered.length}</strong> WABAs
        </p>
        <div className="flex items-center gap-2.5">
          {/* View mode toggle */}
          <div className="flex overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm ring-1 ring-gray-900/[0.03]">
            <button
              onClick={() => setViewMode("list")}
              aria-pressed={viewMode === "list"}
              className={`flex min-h-[44px] items-center gap-1.5 px-3.5 py-2 text-[12px] font-semibold transition-all duration-200 sm:min-h-0 ${
                viewMode === "list"
                  ? "bg-gray-900 text-white shadow-inner"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              }`}
            >
              <svg className="h-4 w-4 sm:h-3.5 sm:w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
              Lista
            </button>
            <button
              onClick={() => setViewMode("all")}
              aria-pressed={viewMode === "all"}
              className={`flex min-h-[44px] items-center gap-1.5 border-l border-gray-200/80 px-3.5 py-2 text-[12px] font-semibold transition-all duration-200 sm:min-h-0 ${
                viewMode === "all"
                  ? "bg-gray-900 text-white shadow-inner"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              }`}
            >
              <svg className="h-4 w-4 sm:h-3.5 sm:w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
                />
              </svg>
              <span className="hidden sm:inline">Ver todo</span>
              <span className="sm:hidden">Grid</span>
            </button>
          </div>

          {/* Sync button */}
          <button
            onClick={handleSync}
            disabled={syncing || cooldown > 0}
            className="flex min-h-[44px] items-center gap-2 rounded-xl border border-gray-200/80 bg-white px-3 py-2 text-[12px] font-semibold text-gray-600 shadow-sm ring-1 ring-gray-900/[0.03] transition-all duration-200 hover:border-teal-500 hover:bg-teal-50 hover:text-teal-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-gray-200/80 disabled:hover:bg-white disabled:hover:text-gray-600 disabled:hover:shadow-sm sm:min-h-0 sm:px-4"
          >
            <svg
              aria-hidden="true"
              className={`h-4 w-4 sm:h-3.5 sm:w-3.5 ${syncing ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span className="hidden sm:inline">
              {syncing
                ? "Sincronizando..."
                : cooldown > 0
                  ? `Espera ${Math.floor(cooldown / 60)}:${String(cooldown % 60).padStart(2, "0")}`
                  : "Sincronizar con Meta"}
            </span>
            <span className="sm:hidden">
              {syncing
                ? "Sync..."
                : cooldown > 0
                  ? `${Math.floor(cooldown / 60)}:${String(cooldown % 60).padStart(2, "0")}`
                  : "Sync"}
            </span>
          </button>
          <span aria-live="polite" aria-atomic="true" className="sr-only">
            {syncing
              ? "Sincronizando"
              : cooldown > 0
                ? `Sincronizar disponible en ${Math.floor(cooldown / 60)}:${String(cooldown % 60).padStart(2, "0")}`
                : ""}
          </span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState />
      ) : viewMode === "all" ? (
        /* ── Mode: Ver todo ── */
        <div className="space-y-12">
          {filtered.map((waba) => (
            <WabaSection key={waba.waba_id} waba={waba} />
          ))}
        </div>
      ) : (
        /* ── Mode: Lista ── */
        <div className="flex items-start gap-6">
          {/* Left: list — full width on mobile, partial on desktop */}
          <div
            className="flex w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm ring-1 ring-gray-900/[0.03] lg:w-[55%] xl:w-[60%]"
            style={{ height: "calc(100vh - 13rem)" }}
          >
            <TemplateList wabas={filtered} selectedId={selectedId} onSelect={handleSelect} />
          </div>

          {/* Right: detail panel — desktop only (inline) */}
          <div className="sticky top-20 hidden lg:block lg:w-[45%] xl:w-[40%]">
            <DetailPanel template={selectedTemplate} wabaId={selectedWabaId} wabaName={selectedWabaName} />
          </div>

          {/* Mobile detail overlay — slides up from bottom */}
          {mobileDetailOpen && selectedTemplate && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Detalle del template"
              onKeyDown={(e) => {
                if (e.key === "Escape") handleMobileDetailClose();
              }}
              className="fixed inset-0 z-50 lg:hidden"
            >
              {/* Backdrop */}
              <div
                className="fade-in-enter absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={handleMobileDetailClose}
              />
              {/* Panel */}
              <div className="slide-up-enter absolute inset-x-0 top-12 bottom-0 flex flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl">
                {/* Close bar */}
                <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3">
                  <button
                    onClick={handleMobileDetailClose}
                    className="flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-xl text-sm font-semibold text-gray-600 transition-colors active:bg-gray-100"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    Volver a la lista
                  </button>
                </div>
                {/* Scrollable detail content */}
                <div className="flex-1 overflow-y-auto">
                  <DetailPanel template={selectedTemplate} wabaId={selectedWabaId} wabaName={selectedWabaName} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

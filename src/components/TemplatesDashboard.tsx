"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Waba, Template } from "@/types/template";
import { useTemplateFilters } from "@/hooks/useTemplateFilters";
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
    filtered,
    totalTemplates,
  } = useTemplateFilters(wabas);

  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedWabaId, setSelectedWabaId] = useState<string | null>(null);

  const isCoolingDown = cooldown > 0;

  useEffect(() => {
    if (!isCoolingDown) return;
    const id = setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [isCoolingDown]);

  const handleSync = useCallback(async () => {
    if (cooldown > 0) return;
    setSyncing(true);
    try {
      const res = await fetch("/api/revalidate", { method: "POST" });
      if (res.status === 429) {
        const data = await res.json();
        setCooldown(data.retryAfterSeconds ?? SYNC_COOLDOWN_S);
      } else {
        setCooldown(SYNC_COOLDOWN_S);
        router.refresh();
      }
    } finally {
      setSyncing(false);
    }
  }, [router, cooldown]);

  const handleSelect = useCallback((templateId: string, wabaId: string) => {
    setSelectedId(templateId);
    setSelectedWabaId(wabaId);
  }, []);

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
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] font-medium text-gray-500">
          Mostrando <strong className="font-display font-bold text-gray-900">{totalTemplates}</strong> templates en{" "}
          <strong className="font-display font-bold text-gray-900">{filtered.length}</strong> WABAs
        </p>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors ${
                viewMode === "list"
                  ? "bg-teal-600 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
              Lista
            </button>
            <button
              onClick={() => setViewMode("all")}
              className={`flex items-center gap-1.5 border-l border-gray-200 px-3 py-2 text-xs font-semibold transition-colors ${
                viewMode === "all"
                  ? "bg-teal-600 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
              Ver todo
            </button>
          </div>

          {/* Sync button */}
          <button
            onClick={handleSync}
            disabled={syncing || cooldown > 0}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 shadow-sm transition-all hover:border-teal-600 hover:bg-teal-50 hover:text-teal-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg
              aria-hidden="true"
              className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`}
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
            {syncing
              ? "Sincronizando..."
              : cooldown > 0
                ? `Espera ${Math.floor(cooldown / 60)}:${String(cooldown % 60).padStart(2, "0")}`
                : "Sincronizar con Meta"}
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState />
      ) : viewMode === "all" ? (
        /* ── Mode: Ver todo ── */
        filtered.map((waba) => (
          <WabaSection key={waba.waba_id} waba={waba} />
        ))
      ) : (
        /* ── Mode: Lista ── */
        <div className="flex items-start gap-5">
          {/* Left: list — fixed height, scrollable */}
          <div className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm lg:w-[55%] xl:w-[60%]" style={{ height: "calc(100vh - 12rem)" }}>
            <TemplateList
              wabas={filtered}
              selectedId={selectedId}
              onSelect={handleSelect}
            />
          </div>

          {/* Right: detail panel — adapts to content */}
          <div className="sticky top-16 hidden lg:block lg:w-[45%] xl:w-[40%]">
            <DetailPanel
              template={selectedTemplate}
              wabaId={selectedWabaId}
              wabaName={selectedWabaName}
            />
          </div>
        </div>
      )}
    </>
  );
}

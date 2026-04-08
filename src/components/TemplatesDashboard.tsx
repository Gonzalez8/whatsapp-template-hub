"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Waba } from "@/types/template";
import { useTemplateFilters } from "@/hooks/useTemplateFilters";
import { FiltersBar } from "./FiltersBar";
import { WabaSection } from "./WabaSection";
import { EmptyState } from "./EmptyState";

const SYNC_COOLDOWN_S = 120;

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
    filtered,
    totalTemplates,
  } = useTemplateFilters(wabas);

  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [cooldown, setCooldown] = useState(0);

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
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-gray-500">
          Mostrando <strong className="text-gray-900">{totalTemplates}</strong> templates en{" "}
          <strong className="text-gray-900">{filtered.length}</strong> WABAs
        </p>
        <button
          onClick={handleSync}
          disabled={syncing || cooldown > 0}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 transition-all hover:border-teal-600 hover:bg-teal-50 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
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

      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        filtered.map((waba) => (
          <WabaSection key={waba.waba_id} waba={waba} />
        ))
      )}
    </>
  );
}

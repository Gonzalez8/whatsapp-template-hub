"use client";

import type { Waba } from "@/types/template";
import { useTemplateFilters } from "@/hooks/useTemplateFilters";
import { FiltersBar } from "./FiltersBar";
import { WabaSection } from "./WabaSection";
import { EmptyState } from "./EmptyState";

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
    filtered,
    totalTemplates,
  } = useTemplateFilters(wabas);

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
      />

      <p className="mb-5 text-[13px] text-gray-500 dark:text-gray-400">
        Mostrando <strong className="text-gray-900 dark:text-gray-100">{totalTemplates}</strong> templates en{" "}
        <strong className="text-gray-900 dark:text-gray-100">{filtered.length}</strong> WABAs
      </p>

      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        filtered.map((waba) => <WabaSection key={waba.waba_id} waba={waba} />)
      )}
    </>
  );
}

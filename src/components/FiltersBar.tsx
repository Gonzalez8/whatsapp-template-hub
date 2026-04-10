"use client";

import { useState } from "react";
import type { Waba, TemplateStatus } from "@/types/template";
import { FilterDropdown } from "./FilterDropdown";

const STATUSES: TemplateStatus[] = ["APPROVED", "PENDING", "REJECTED"];

const STATUS_COLORS: Record<TemplateStatus, { active: string; dot: string }> = {
  APPROVED: { active: "border-emerald-400 bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  PENDING: { active: "border-amber-400 bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  REJECTED: { active: "border-red-400 bg-red-50 text-red-700", dot: "bg-red-500" },
};

interface FiltersBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  wabas: Waba[];
  selectedWabas: Set<string>;
  onToggleWaba: (id: string) => void;
  selectedStatuses: Set<TemplateStatus>;
  onToggleStatus: (status: TemplateStatus) => void;
  allLanguages: string[];
  selectedLanguages: Set<string>;
  onToggleLanguage: (lang: string) => void;
  allCategories: string[];
  selectedCategories: Set<string>;
  onToggleCategory: (cat: string) => void;
}

interface FilterDropdownGroupProps {
  wabas: Waba[];
  selectedWabas: Set<string>;
  onToggleWaba: (id: string) => void;
  allCategories: string[];
  selectedCategories: Set<string>;
  onToggleCategory: (cat: string) => void;
  allLanguages: string[];
  selectedLanguages: Set<string>;
  onToggleLanguage: (lang: string) => void;
}

function FilterDropdownGroup({
  wabas,
  selectedWabas,
  onToggleWaba,
  allCategories,
  selectedCategories,
  onToggleCategory,
  allLanguages,
  selectedLanguages,
  onToggleLanguage,
}: FilterDropdownGroupProps) {
  return (
    <>
      <FilterDropdown
        label="WABA"
        items={wabas.map((w) => ({
          id: w.waba_id,
          name: w.waba_name,
          count: w.templates.length,
        }))}
        selected={selectedWabas}
        onToggle={onToggleWaba}
      />

      {allCategories.length > 1 && (
        <FilterDropdown
          label="Categoria"
          items={allCategories.map((c) => ({ id: c, name: c }))}
          selected={selectedCategories}
          onToggle={onToggleCategory}
          accentClass="bg-violet-500"
        />
      )}

      {allLanguages.length > 1 && (
        <FilterDropdown
          label="Idioma"
          items={allLanguages.map((l) => ({ id: l, name: l }))}
          selected={selectedLanguages}
          onToggle={onToggleLanguage}
          accentClass="bg-indigo-500"
        />
      )}
    </>
  );
}

export function FiltersBar({
  search,
  onSearchChange,
  wabas,
  selectedWabas,
  onToggleWaba,
  selectedStatuses,
  onToggleStatus,
  allLanguages,
  selectedLanguages,
  onToggleLanguage,
  allCategories,
  selectedCategories,
  onToggleCategory,
}: FiltersBarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFilterCount =
    selectedStatuses.size + selectedWabas.size + selectedCategories.size + selectedLanguages.size;

  return (
    <div className="sticky top-0 z-50 -mx-1 rounded-2xl bg-white/80 px-4 py-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] ring-1 ring-gray-900/[0.04] backdrop-blur-xl">
      {/* Row 1: Search + mobile filter toggle */}
      <div className="flex items-center gap-2.5">
        {/* Search */}
        <div className="relative min-w-0 flex-1">
          <label htmlFor="template-search" className="sr-only">
            Buscar templates
          </label>
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" strokeWidth="2" />
            <path d="m21 21-4.35-4.35" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            id="template-search"
            type="text"
            placeholder="Buscar templates..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-11 w-full rounded-xl border border-gray-200/80 bg-gray-50/50 pr-3 pl-10 text-sm outline-none transition-all placeholder:text-gray-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/10 sm:h-auto sm:py-2 sm:pl-9 sm:text-[13px]"
          />
        </div>

        {/* Mobile filter toggle button */}
        <button
          onClick={() => setFiltersOpen((o) => !o)}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-xl border border-gray-200/80 bg-gray-50/50 px-3 text-xs font-medium text-gray-600 transition-colors sm:hidden"
          aria-expanded={filtersOpen}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
          </svg>
          Filtros
          {activeFilterCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-teal-600 px-1 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Desktop inline filters */}
        <div className="hidden items-center gap-2.5 sm:flex">
          {/* Divider */}
          <div className="h-6 w-px bg-gray-200/80" />

          {/* Status pills */}
          <div className="flex gap-1.5">
            {STATUSES.map((s) => {
              const isActive = selectedStatuses.has(s);
              const colors = STATUS_COLORS[s];
              return (
                <button
                  key={s}
                  onClick={() => onToggleStatus(s)}
                  aria-pressed={isActive}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[11px] font-semibold tracking-wide transition-all duration-200 ${
                    isActive
                      ? colors.active
                      : "border-gray-200/80 bg-gray-50/50 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full transition-colors ${isActive ? colors.dot : "bg-gray-300"}`} />
                  {s}
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="h-6 w-px bg-gray-200/80" />

          <FilterDropdownGroup
            wabas={wabas}
            selectedWabas={selectedWabas}
            onToggleWaba={onToggleWaba}
            allCategories={allCategories}
            selectedCategories={selectedCategories}
            onToggleCategory={onToggleCategory}
            allLanguages={allLanguages}
            selectedLanguages={selectedLanguages}
            onToggleLanguage={onToggleLanguage}
          />
        </div>
      </div>

      {/* Mobile collapsible filters */}
      {filtersOpen && (
        <div className="mt-3 flex flex-col gap-3 border-t border-gray-200/80 pt-3 sm:hidden">
          {/* Status pills */}
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Estado</p>
            <div className="flex gap-1.5">
              {STATUSES.map((s) => {
                const isActive = selectedStatuses.has(s);
                const colors = STATUS_COLORS[s];
                return (
                  <button
                    key={s}
                    onClick={() => onToggleStatus(s)}
                    aria-pressed={isActive}
                    className={`flex min-h-[44px] items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold tracking-wide transition-all duration-200 ${
                      isActive
                        ? colors.active
                        : "border-gray-200/80 bg-gray-50/50 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full transition-colors ${isActive ? colors.dot : "bg-gray-300"}`} />
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dropdowns */}
          <div className="flex flex-wrap gap-2">
            <FilterDropdownGroup
              wabas={wabas}
              selectedWabas={selectedWabas}
              onToggleWaba={onToggleWaba}
              allCategories={allCategories}
              selectedCategories={selectedCategories}
              onToggleCategory={onToggleCategory}
              allLanguages={allLanguages}
              selectedLanguages={selectedLanguages}
              onToggleLanguage={onToggleLanguage}
            />
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

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
  return (
    <div className="sticky top-0 z-50 bg-[#f5f6f8]/95 py-3 backdrop-blur-md">
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative min-w-0 flex-1">
          <label htmlFor="template-search" className="sr-only">
            Buscar templates
          </label>
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
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
            placeholder="Buscar..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white py-[7px] pr-3 pl-8 text-xs outline-none transition-all focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10"
          />
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-gray-200" />

        {/* Status pills */}
        <div className="flex gap-1">
          {STATUSES.map((s) => {
            const isActive = selectedStatuses.has(s);
            const colors = STATUS_COLORS[s];
            return (
              <button
                key={s}
                onClick={() => onToggleStatus(s)}
                aria-pressed={isActive}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-[7px] text-[11px] font-semibold tracking-wide transition-all ${
                  isActive
                    ? colors.active
                    : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isActive ? colors.dot : "bg-gray-300"}`} />
                {s}
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="h-5 w-px bg-gray-200" />

        {/* WABA dropdown */}
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

        {/* Category dropdown */}
        {allCategories.length > 1 && (
          <FilterDropdown
            label="Categoria"
            items={allCategories.map((c) => ({ id: c, name: c }))}
            selected={selectedCategories}
            onToggle={onToggleCategory}
            accentClass="bg-violet-500"
          />
        )}

        {/* Language dropdown */}
        {allLanguages.length > 1 && (
          <FilterDropdown
            label="Idioma"
            items={allLanguages.map((l) => ({ id: l, name: l }))}
            selected={selectedLanguages}
            onToggle={onToggleLanguage}
            accentClass="bg-indigo-500"
          />
        )}
      </div>
    </div>
  );
}

"use client";

import type { Waba, TemplateStatus } from "@/types/template";

const STATUSES: TemplateStatus[] = ["APPROVED", "PENDING", "REJECTED"];

const STATUS_ACTIVE_STYLES: Record<TemplateStatus, string> = {
  APPROVED: "bg-emerald-500 text-white border-emerald-500",
  PENDING: "bg-amber-500 text-white border-amber-500",
  REJECTED: "bg-red-500 text-white border-red-500",
};

interface FiltersBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  wabas: Waba[];
  selectedWabas: Set<string>;
  onToggleWaba: (id: string) => void;
  selectedStatuses: Set<TemplateStatus>;
  onToggleStatus: (status: TemplateStatus) => void;
}

export function FiltersBar({
  search,
  onSearchChange,
  wabas,
  selectedWabas,
  onToggleWaba,
  selectedStatuses,
  onToggleStatus,
}: FiltersBarProps) {
  return (
    <div className="sticky top-0 z-50 border-b border-transparent bg-gray-100 py-4 dark:bg-gray-900">
      <div className="mb-3 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1">
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
            placeholder="Buscar por nombre, texto, idioma o categoria..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pr-4 pl-10 text-sm outline-none transition-all focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:focus:border-teal-400"
          />
        </div>
        <div className="flex gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => onToggleStatus(s)}
              aria-pressed={selectedStatuses.has(s)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide transition-all ${
                selectedStatuses.has(s)
                  ? STATUS_ACTIVE_STYLES[s]
                  : "border-gray-200 bg-white text-gray-600 hover:border-teal-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {wabas.map((w) => (
          <button
            key={w.waba_id}
            onClick={() => onToggleWaba(w.waba_id)}
            aria-pressed={selectedWabas.has(w.waba_id)}
            className={`rounded-full border px-4 py-1.5 text-[13px] font-medium whitespace-nowrap transition-all ${
              selectedWabas.has(w.waba_id)
                ? "border-teal-600 bg-teal-600 text-white"
                : "border-gray-200 bg-white text-gray-700 hover:border-teal-600 hover:bg-teal-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            {w.waba_name} ({w.templates.length})
          </button>
        ))}
      </div>
    </div>
  );
}

"use client";

import type { TemplateStatus, Waba } from "@/types/template";
import { CATEGORY_LABELS, STATUS_LABELS, label } from "@/lib/template-utils";
import { FilterDropdown } from "./FilterDropdown";

interface ListToolbarProps {
  wabas: Waba[];
  selectedWabas: Set<string>;
  onToggleWaba: (id: string) => void;
  onClearWabas: () => void;
  onOpenWabas: () => void;
  allStatuses: TemplateStatus[];
  selectedStatuses: Set<TemplateStatus>;
  onToggleStatus: (status: TemplateStatus) => void;
  allCategories: string[];
  selectedCategories: Set<string>;
  onToggleCategory: (category: string) => void;
  allLanguages: string[];
  selectedLanguages: Set<string>;
  onToggleLanguage: (language: string) => void;
  hideSamples: boolean;
  onToggleHideSamples: () => void;
  totalTemplates: number;
  totalWabas: number;
}

export function ListToolbar(props: ListToolbarProps) {
  const selectedWabaList = props.wabas.filter((w) => props.selectedWabas.has(w.waba_id));

  return (
    <div className="border-line flex shrink-0 flex-col gap-2 border-b px-4 py-2.5">
      {selectedWabaList.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {selectedWabaList.map((w) => (
            <span
              key={w.waba_id}
              className="bg-accent-soft text-accent-ink inline-flex h-7 items-center gap-1 rounded-full pr-1 pl-2.5 text-xs font-medium"
            >
              <span className="max-w-[180px] truncate">{w.waba_name}</span>
              <button
                type="button"
                onClick={() => props.onToggleWaba(w.waba_id)}
                aria-label={`Quitar ${w.waba_name}`}
                className="hover:bg-accent/15 flex h-5 w-5 items-center justify-center rounded-full"
              >
                <svg aria-hidden="true" className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeWidth="2.5" d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={props.onClearWabas}
            className="text-accent-ink ml-1 text-xs font-medium hover:underline"
          >
            Limpiar
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={props.onOpenWabas}
          className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium lg:hidden ${
            props.selectedWabas.size > 0
              ? "border-accent bg-accent-soft text-accent-ink"
              : "border-line-strong bg-surface"
          }`}
        >
          WABAs
          {props.selectedWabas.size > 0 && (
            <span className="bg-accent text-on-accent rounded-full px-1.5 text-[11px]">{props.selectedWabas.size}</span>
          )}
        </button>
        {/* With a single status in the data (e.g. everything approved) the filter is just noise. */}
        {props.allStatuses.length > 1 && (
          <FilterDropdown
            label="Estado"
            items={props.allStatuses.map((s) => ({ id: s, name: label(STATUS_LABELS, s) }))}
            selected={props.selectedStatuses}
            onToggle={props.onToggleStatus}
          />
        )}
        {props.allCategories.length > 1 && (
          <FilterDropdown
            label="Categoría"
            items={props.allCategories.map((c) => ({ id: c, name: label(CATEGORY_LABELS, c) }))}
            selected={props.selectedCategories}
            onToggle={props.onToggleCategory}
          />
        )}
        {props.allLanguages.length > 1 && (
          <FilterDropdown
            label="Idioma"
            items={props.allLanguages.map((l) => ({ id: l, name: l }))}
            selected={props.selectedLanguages}
            onToggle={props.onToggleLanguage}
          />
        )}
        <label className="text-ink/80 flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={!props.hideSamples}
            onChange={props.onToggleHideSamples}
            className="accent-accent h-3.5 w-3.5"
          />
          Incluir ejemplos de Meta
        </label>
        <span className="text-muted ml-auto text-xs">
          <strong className="text-ink font-semibold">{props.totalTemplates}</strong> plantillas · {props.totalWabas}{" "}
          WABAs
        </span>
      </div>
    </div>
  );
}

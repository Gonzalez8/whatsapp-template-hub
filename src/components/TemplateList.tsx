"use client";

import { useState, useCallback } from "react";
import type { Waba } from "@/types/template";
import { TemplateListItem } from "./TemplateListItem";

interface TemplateListProps {
  wabas: Waba[];
  selectedId: string | null;
  onSelect: (templateId: string, wabaId: string) => void;
}

export function TemplateList({ wabas, selectedId, onSelect }: TemplateListProps) {
  // First WABA open by default
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const first = wabas[0]?.waba_id;
    return first ? new Set([first]) : new Set();
  });

  const toggle = useCallback((wabaId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(wabaId)) next.delete(wabaId);
      else next.add(wabaId);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpanded(new Set(wabas.map((w) => w.waba_id)));
  }, [wabas]);

  const collapseAll = useCallback(() => {
    setExpanded(new Set());
  }, []);

  const allExpanded = expanded.size === wabas.length;

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 px-4 py-2 sm:py-2">
        <span className="text-[10px] font-medium tracking-wider text-gray-500 uppercase">Templates</span>
        <button
          onClick={allExpanded ? collapseAll : expandAll}
          className="min-h-[44px] text-xs font-semibold text-gray-400 transition-colors hover:text-teal-600 sm:min-h-0 sm:text-[10px]"
        >
          {allExpanded ? "Contraer todos" : "Expandir todos"}
        </button>
      </div>

      {/* List */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {wabas.map((waba) => {
          const isOpen = expanded.has(waba.waba_id);
          return (
            <div key={waba.waba_id}>
              {/* WABA header -- clickable */}
              <button
                onClick={() => toggle(waba.waba_id)}
                aria-expanded={isOpen}
                className="sticky top-0 z-10 flex min-h-[48px] w-full items-center gap-2.5 border-b border-gray-200/80 bg-white/95 px-4 py-3 text-left backdrop-blur-sm transition-colors duration-150 hover:bg-gray-50 active:bg-gray-100 sm:min-h-0 sm:py-2.5"
              >
                <svg
                  className={`h-3 w-3 shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m9 5 7 7-7 7" />
                </svg>
                <div className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 text-[8px] font-bold text-white shadow-sm shadow-teal-600/20">
                  {waba.waba_name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-display text-[11px] font-bold text-gray-700">{waba.waba_name}</span>
                  {waba.phone_numbers.length > 0 && (
                    <div className="mt-0.5 truncate text-[10px] text-gray-500">
                      {waba.phone_numbers.map((pn, i) => (
                        <span key={pn.id}>
                          {i > 0 && " · "}
                          {pn.display_phone_number} ({pn.verified_name})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                  {waba.templates.length}
                </span>
              </button>

              {/* Templates -- collapsible */}
              {isOpen &&
                waba.templates.map((t) => (
                  <TemplateListItem
                    key={t.id}
                    template={t}
                    selected={selectedId === t.id}
                    onSelect={() => onSelect(t.id, waba.waba_id)}
                  />
                ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

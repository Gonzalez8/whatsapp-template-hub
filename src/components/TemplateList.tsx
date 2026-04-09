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
      <div className="flex items-center justify-end border-b border-gray-200 px-3 py-1.5">
        <button
          onClick={allExpanded ? collapseAll : expandAll}
          className="text-[10px] font-semibold text-gray-400 transition-colors hover:text-gray-600"
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
              {/* WABA header — clickable */}
              <button
                onClick={() => toggle(waba.waba_id)}
                className="sticky top-0 z-10 flex w-full items-center gap-2.5 border-b border-gray-200 bg-gray-50/95 px-4 py-2.5 text-left backdrop-blur-sm transition-colors hover:bg-gray-100/80"
              >
                <svg
                  className={`h-3 w-3 shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m9 5 7 7-7 7" />
                </svg>
                <div className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-emerald-500 to-teal-600 text-[8px] font-bold text-white">
                  {waba.waba_name.charAt(0)}
                </div>
                <span className="font-display flex-1 text-[11px] font-bold text-gray-700">
                  {waba.waba_name}
                </span>
                <span className="rounded-full bg-gray-200/60 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                  {waba.templates.length}
                </span>
              </button>

              {/* Templates — collapsible */}
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

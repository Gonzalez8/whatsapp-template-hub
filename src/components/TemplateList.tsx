"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Template, Waba } from "@/types/template";
import { groupByName, type TemplateFamily } from "@/lib/template-groups";
import { TemplateListItem } from "./TemplateListItem";

interface TemplateListProps {
  wabas: Waba[];
  selectedId: string | null;
  preferredLanguage?: string;
  onSelect: (template: Template) => void;
  compareIds: Set<string>;
  compareFull: boolean;
  onToggleCompare: (family: TemplateFamily) => void;
  /**
   * Opens every group whenever it changes to a non-empty value (a new search or WABA
   * selection), so no result stays hidden; groups can still be collapsed afterwards.
   */
  openAllKey: string;
}

export function TemplateList({
  wabas,
  selectedId,
  preferredLanguage,
  onSelect,
  compareIds,
  compareFull,
  onToggleCompare,
  openAllKey,
}: TemplateListProps) {
  // First WABA open by default
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const first = wabas[0]?.waba_id;
    return first ? new Set([first]) : new Set();
  });

  // Starts empty so a list mounted with an active filter (shared link) opens too.
  const [lastOpenAllKey, setLastOpenAllKey] = useState("");
  if (openAllKey !== lastOpenAllKey) {
    setLastOpenAllKey(openAllKey);
    if (openAllKey) setExpanded(new Set(wabas.map((w) => w.waba_id)));
  }

  // Open the group of the selected template (keyboard navigation, links with ?t=).
  useEffect(() => {
    if (!selectedId) return;
    const owner = wabas.find((w) => w.templates.some((t) => t.id === selectedId));
    if (owner) setExpanded((prev) => (prev.has(owner.waba_id) ? prev : new Set(prev).add(owner.waba_id)));
  }, [selectedId, wabas]);

  const families = useMemo(() => new Map(wabas.map((w) => [w.waba_id, groupByName(w.templates)])), [wabas]);

  const toggle = useCallback((wabaId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(wabaId)) next.delete(wabaId);
      else next.add(wabaId);
      return next;
    });
  }, []);

  const allExpanded = wabas.every((w) => expanded.has(w.waba_id));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-line flex items-center justify-between border-b px-4 py-1.5">
        <span className="text-muted text-[11px] font-semibold tracking-wider uppercase">Plantillas</span>
        <button
          type="button"
          onClick={() => setExpanded(allExpanded ? new Set() : new Set(wabas.map((w) => w.waba_id)))}
          className="text-accent-ink min-h-[36px] text-xs font-medium hover:underline"
        >
          {allExpanded ? "Contraer todos" : "Expandir todos"}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {wabas.map((waba) => {
          const isOpen = expanded.has(waba.waba_id);
          const rows = families.get(waba.waba_id) ?? [];
          return (
            <section key={waba.waba_id} aria-label={waba.waba_name}>
              <button
                type="button"
                onClick={() => toggle(waba.waba_id)}
                aria-expanded={isOpen}
                className="border-line bg-subtle/95 hover:bg-canvas sticky top-0 z-10 flex min-h-[44px] w-full items-center gap-2 border-b px-4 py-2 text-left backdrop-blur-sm"
              >
                <svg
                  aria-hidden="true"
                  className={`text-muted h-3 w-3 shrink-0 transition-transform duration-150 ${isOpen ? "rotate-90" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m9 5 7 7-7 7" />
                </svg>
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{waba.waba_name}</span>
                {waba.phone_numbers[0] && (
                  <span className="text-faint hidden truncate font-mono text-[11px] sm:inline">
                    {waba.phone_numbers[0].display_phone_number}
                  </span>
                )}
                <span className="bg-line text-ink/80 min-w-6 rounded-full px-1.5 text-center text-[11px]">
                  {rows.length}
                </span>
              </button>

              {isOpen && waba.error && (
                <p className="border-line border-b bg-amber-50 px-8 py-2 text-xs text-amber-800">
                  No se pudieron cargar las plantillas de esta WABA: {waba.error}
                </p>
              )}

              {isOpen &&
                rows.map((family) => {
                  const compared = family.variants.some((v) => compareIds.has(v.id));
                  return (
                    <TemplateListItem
                      key={family.name}
                      family={family}
                      selectedId={selectedId}
                      preferredLanguage={preferredLanguage}
                      onSelect={onSelect}
                      compared={compared}
                      compareDisabled={compareFull && !compared}
                      onToggleCompare={() => onToggleCompare(family)}
                    />
                  );
                })}
            </section>
          );
        })}
      </div>
    </div>
  );
}

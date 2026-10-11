"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Template } from "@/types/template";
import type { TemplateFamily } from "@/lib/template-groups";
import { pickVariant } from "@/lib/template-groups";
import { CATEGORY_LABELS, STATUS_LABELS, headerKind, label } from "@/lib/template-utils";
import { buildSnippet, templateContentParts } from "@/lib/search";
import { Highlight, renderHighlighted, useSearchTerms } from "./Highlight";

interface TemplateListItemProps {
  family: TemplateFamily;
  selectedId: string | null;
  /** Language to open when the row is clicked, if the family has it. */
  preferredLanguage?: string;
  onSelect: (template: Template) => void;
  compared: boolean;
  compareDisabled: boolean;
  onToggleCompare: () => void;
}

/** One template name with a tag per language it exists in. */
export function TemplateListItem({
  family,
  selectedId,
  preferredLanguage,
  onSelect,
  compared,
  compareDisabled,
  onToggleCompare,
}: TemplateListItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const terms = useSearchTerms();

  const selectedVariant = family.variants.find((v) => v.id === selectedId);
  const shown = selectedVariant ?? pickVariant(family, preferredLanguage);

  // Where in the content the search matched, so it's clear why the template is listed.
  const snippet = useMemo(
    () => (terms.length ? buildSnippet(templateContentParts(shown).join(" · "), terms) : null),
    [shown, terms],
  );

  const meta = [
    label(CATEGORY_LABELS, shown.category),
    headerKind(shown),
    shown.status !== "APPROVED" ? label(STATUS_LABELS, shown.status) : undefined,
  ]
    .filter(Boolean)
    .join(" · ");

  // Keep the selection visible when moving through the list with the keyboard.
  useEffect(() => {
    if (selectedVariant) ref.current?.scrollIntoView({ block: "nearest" });
  }, [selectedVariant]);

  return (
    <div
      ref={ref}
      className={`border-line/70 flex items-center gap-2 border-b pr-3 pl-8 ${
        selectedVariant ? "bg-accent-soft shadow-[inset_3px_0_0_var(--color-accent)]" : "hover:bg-subtle"
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(pickVariant(family, preferredLanguage))}
        aria-current={selectedVariant ? "true" : undefined}
        className="min-w-0 flex-1 py-2.5 text-left"
      >
        <span className="block truncate font-mono text-[13px] font-medium">
          <Highlight text={family.name} />
        </span>
        <span className="text-muted mt-0.5 block truncate text-xs">
          {snippet ? renderHighlighted(snippet.text, snippet.ranges) : meta}
        </span>
      </button>

      <span className="flex shrink-0 flex-wrap justify-end gap-1" aria-label="Idiomas">
        {family.variants.map((v) => {
          const active = v.id === selectedId;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onSelect(v)}
              aria-pressed={active}
              title={`Ver en ${v.language}`}
              className={`rounded-[5px] border px-1.5 py-0.5 font-mono text-[11px] font-medium ${
                active
                  ? "border-ink bg-ink text-white"
                  : "border-line bg-canvas text-muted hover:border-line-strong hover:text-ink"
              }`}
            >
              {v.language}
            </button>
          );
        })}
      </span>

      <label
        className={`text-muted flex shrink-0 items-center gap-1 text-[11px] ${compareDisabled ? "opacity-40" : "cursor-pointer"}`}
        title={compareDisabled ? "Máximo de plantillas en la comparación" : "Añadir a la comparación"}
      >
        <input
          type="checkbox"
          checked={compared}
          disabled={compareDisabled}
          onChange={onToggleCompare}
          aria-label={`Comparar ${family.name}`}
          className="accent-accent h-3.5 w-3.5"
        />
        <span className="hidden xl:inline">Comparar</span>
      </label>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import type { PreviewMode, Template } from "@/types/template";
import { diffTexts } from "@/lib/diff";
import { CATEGORY_LABELS, HEADER_FORMAT_LABELS, label, resolveComponentText } from "@/lib/template-utils";
import { WhatsAppPreview } from "./WhatsAppPreview";

export interface CompareItem {
  template: Template;
  wabaName: string;
}

interface CompareViewProps {
  items: CompareItem[];
  onRemove: (templateId: string) => void;
  onClear: () => void;
  onBack: () => void;
}

const segmented = (active: boolean) =>
  `h-8 px-3 text-xs ${active ? "bg-ink font-medium text-white" : "bg-surface text-ink/80 hover:bg-canvas"}`;

const component = (t: Template, type: string) => t.components?.find((c) => c.type === type);

/** Rows of the facts table: what each template has, as plain text so values can be compared. */
function facts(t: Template, mode: PreviewMode): [string, string][] {
  const header = component(t, "HEADER");
  const buttons = t.components?.flatMap((c) => c.buttons ?? []) ?? [];
  return [
    ["Idioma", t.language],
    ["Categoría", label(CATEGORY_LABELS, t.category)],
    [
      "Cabecera",
      header?.format && header.format !== "TEXT"
        ? label(HEADER_FORMAT_LABELS, header.format)
        : (resolveComponentText(header, mode) ?? "—"),
    ],
    ["Pie", resolveComponentText(component(t, "FOOTER"), mode) ?? "—"],
    [
      "Botones",
      buttons.length
        ? buttons.map((b) => [b.text, b.url ?? b.phone_number].filter(Boolean).join(" → ")).join("\n")
        : "—",
    ],
  ];
}

export function CompareView({ items, onRemove, onClear, onBack }: CompareViewProps) {
  const [mode, setMode] = useState<PreviewMode>("template");
  const [highlight, setHighlight] = useState(true);

  const bodyDiffs = useMemo(() => {
    if (!highlight || items.length < 2) return undefined;
    return diffTexts(items.map((i) => resolveComponentText(component(i.template, "BODY"), mode) ?? ""));
  }, [items, mode, highlight]);

  const rows = useMemo(() => items.map((i) => facts(i.template, mode)), [items, mode]);
  // A fact differs when not every template has the same value for it.
  const differs = (row: number) => new Set(rows.map((r) => r[row][1])).size > 1;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-line bg-surface flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-2.5 sm:px-5">
        <button
          type="button"
          onClick={onBack}
          className="border-line-strong hover:border-accent flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[13px]"
        >
          <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeWidth="2" d="M15 18l-6-6 6-6" />
          </svg>
          Volver a la lista
        </button>
        <h2 className="text-[15px] font-semibold">
          Comparar plantillas <span className="text-muted font-normal">· {items.length}</span>
        </h2>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1.5 text-[13px]">
            <input
              type="checkbox"
              checked={highlight}
              onChange={(e) => setHighlight(e.target.checked)}
              className="accent-accent h-4 w-4"
            />
            Resaltar diferencias
          </label>
          <div
            role="group"
            aria-label="Modo de la vista previa"
            className="border-line-strong flex overflow-hidden rounded-lg border"
          >
            <button
              type="button"
              onClick={() => setMode("template")}
              aria-pressed={mode === "template"}
              className={segmented(mode === "template")}
            >
              Plantilla
            </button>
            <button
              type="button"
              onClick={() => setMode("example")}
              aria-pressed={mode === "example"}
              className={`${segmented(mode === "example")} border-line-strong border-l`}
            >
              Con ejemplo
            </button>
          </div>
          <button type="button" onClick={onClear} className="text-accent-ink text-xs font-medium hover:underline">
            Vaciar
          </button>
        </div>
      </div>

      {items.length < 2 ? (
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <p className="text-sm font-semibold">Añade al menos dos plantillas</p>
          <p className="text-muted mt-1 max-w-[300px] text-[13px]">
            Márcalas con la casilla «Comparar» de la lista o con el botón del detalle.
          </p>
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-5">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] items-start gap-4">
            {items.map((item, col) => (
              <article key={item.template.id} className="border-line bg-surface overflow-hidden rounded-2xl border">
                <div className="flex items-start gap-2 px-4 pt-3.5 pb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-mono text-sm font-medium break-all">{item.template.name}</h3>
                    <p className="text-muted mt-0.5 text-xs">
                      {item.wabaName} · <span className="font-mono">{item.template.language}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(item.template.id)}
                    aria-label={`Quitar ${item.template.name} de la comparación`}
                    className="text-muted hover:bg-canvas hover:text-ink flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  >
                    <svg
                      aria-hidden="true"
                      className="h-3.5 w-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeWidth="2.5" d="M6 6l12 12M18 6 6 18" />
                    </svg>
                  </button>
                </div>
                <WhatsAppPreview components={item.template.components ?? []} mode={mode} bodyDiff={bodyDiffs?.[col]} />
                <dl className="px-4 py-3 text-xs">
                  {rows[col].map(([name, value], row) => (
                    <div
                      key={name}
                      className="border-line/70 grid grid-cols-[72px_1fr] gap-2 border-b py-1.5 last:border-b-0"
                    >
                      <dt className="text-muted">{name}</dt>
                      <dd
                        className={`min-w-0 break-all whitespace-pre-line ${
                          highlight && differs(row) ? "rounded-sm bg-amber-200/60 px-1" : ""
                        }`}
                      >
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

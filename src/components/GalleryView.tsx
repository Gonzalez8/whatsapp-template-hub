"use client";

import { useState } from "react";
import type { PreviewMode, Template, Waba } from "@/types/template";
import { CATEGORY_LABELS, label } from "@/lib/template-utils";
import { WhatsAppPreview } from "./WhatsAppPreview";
import { Highlight } from "./Highlight";

interface GalleryViewProps {
  wabas: Waba[];
  onOpen: (template: Template) => void;
  compareIds: Set<string>;
  compareFull: boolean;
  onToggleCompare: (templateId: string) => void;
}

const segmented = (active: boolean) =>
  `h-7 px-2.5 text-xs ${active ? "bg-ink font-medium text-white" : "bg-surface text-ink/80 hover:bg-canvas"}`;

const byNameThenLanguage = (a: Template, b: Template) =>
  a.name.localeCompare(b.name) || a.language.localeCompare(b.language);

/** Every filtered template as a WhatsApp bubble, grouped by WABA, to browse by scrolling. */
export function GalleryView({ wabas, onOpen, compareIds, compareFull, onToggleCompare }: GalleryViewProps) {
  const [mode, setMode] = useState<PreviewMode>("template");

  return (
    <div className="bg-canvas h-full overflow-y-auto">
      <div className="flex items-center justify-end gap-2 px-4 pt-3 sm:px-5">
        <span className="text-muted text-xs">Vista previa</span>
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
      </div>

      {wabas.map((waba) => (
        <section key={waba.waba_id} aria-label={waba.waba_name} className="px-4 pb-6 sm:px-5">
          <h2 className="bg-canvas/95 sticky top-0 z-10 flex items-baseline gap-2 py-3 backdrop-blur-sm">
            <span className="text-[15px] font-semibold">{waba.waba_name}</span>
            <span className="text-muted text-xs">
              {waba.templates.length} {waba.templates.length === 1 ? "plantilla" : "plantillas"}
            </span>
          </h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] items-start gap-4">
            {[...waba.templates].sort(byNameThenLanguage).map((t) => {
              const compared = compareIds.has(t.id);
              return (
                <article
                  key={t.id}
                  // Off-screen cards skip layout and paint, so long galleries scroll smoothly.
                  className="border-line bg-surface overflow-hidden rounded-2xl border [contain-intrinsic-size:auto_360px] [content-visibility:auto]"
                >
                  <div className="flex items-start gap-2 px-4 pt-3 pb-2.5">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-mono text-[13px] font-medium" title={t.name}>
                        <Highlight text={t.name} />
                      </h3>
                      <p className="text-muted mt-0.5 text-xs">
                        <span className="font-mono">{t.language}</span> · {label(CATEGORY_LABELS, t.category)}
                      </p>
                    </div>
                    <label
                      className={`text-muted flex shrink-0 items-center gap-1 text-[11px] ${compareFull && !compared ? "opacity-40" : "cursor-pointer"}`}
                    >
                      <input
                        type="checkbox"
                        checked={compared}
                        disabled={compareFull && !compared}
                        onChange={() => onToggleCompare(t.id)}
                        aria-label={`Comparar ${t.name} (${t.language})`}
                        className="accent-accent h-3.5 w-3.5"
                      />
                      Comparar
                    </label>
                  </div>
                  <WhatsAppPreview components={t.components ?? []} mode={mode} />
                  <button
                    type="button"
                    onClick={() => onOpen(t)}
                    className="border-line text-accent-ink hover:bg-subtle w-full border-t px-4 py-2.5 text-left text-xs font-medium"
                  >
                    Ver detalle →
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

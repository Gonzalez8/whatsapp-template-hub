"use client";

import { useState } from "react";
import type { PreviewMode, Template, Waba } from "@/types/template";
import { CATEGORY_LABELS, label, metaTemplateUrl } from "@/lib/template-utils";
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
                  <div className="px-4 pt-3 pb-2.5">
                    {/* Names often share a long prefix; the end is what tells them apart, so never truncate. */}
                    <h3 className="font-mono text-[13px] leading-snug font-medium break-all">
                      <Highlight text={t.name} />
                    </h3>
                    <p className="text-muted mt-0.5 text-xs">
                      <span className="font-mono">{t.language}</span> · {label(CATEGORY_LABELS, t.category)}
                    </p>
                  </div>
                  <WhatsAppPreview components={t.components ?? []} mode={mode} />
                  <div className="border-line flex items-center border-t">
                    <button
                      type="button"
                      onClick={() => onOpen(t)}
                      className="text-accent-ink hover:bg-subtle flex-1 px-4 py-2.5 text-left text-xs font-medium"
                    >
                      Ver detalle →
                    </button>
                    <a
                      href={metaTemplateUrl(waba.waba_id, t.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Abrir ${t.name} (${t.language}) en Meta`}
                      className="border-line text-ink hover:bg-subtle shrink-0 border-x px-4 py-2.5 text-xs font-medium"
                    >
                      Meta ↗
                    </a>
                    <label
                      className={`text-muted flex shrink-0 items-center gap-1.5 px-4 py-2.5 text-xs ${compareFull && !compared ? "opacity-40" : "cursor-pointer"}`}
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
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

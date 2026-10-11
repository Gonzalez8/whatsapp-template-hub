"use client";

import { useState, type KeyboardEvent } from "react";
import type { PreviewMode, Template } from "@/types/template";
import { extractVariables, hasExamples, metaTemplateUrl } from "@/lib/template-utils";
import { WhatsAppPreview } from "./WhatsAppPreview";
import { Highlight } from "./Highlight";
import { TemplateBadges } from "./TemplateBadges";
import { CopyButton } from "./CopyButton";
import { ButtonsTab, InfoTab, VariablesTab, countButtons } from "./TemplateDetails";

type Tab = "preview" | "variables" | "buttons" | "info";

interface DetailPanelProps {
  template: Template | null;
  wabaId: string | null;
  wabaName: string;
  /** Language variants of the same template (same name, same WABA). */
  variants: Template[];
  onSelectVariant: (template: Template) => void;
  compared: boolean;
  compareDisabled: boolean;
  onToggleCompare: () => void;
  onCompareLanguages: () => void;
}

const segmented = (active: boolean) =>
  `h-7 px-2.5 text-xs ${active ? "bg-ink font-medium text-white" : "bg-surface text-ink/80 hover:bg-canvas"}`;

function PanelEmpty() {
  return (
    <div className="flex h-full min-h-[320px] flex-col items-center justify-center px-6 text-center">
      <p className="text-sm font-semibold">Selecciona una plantilla</p>
      <p className="text-muted mt-1 max-w-[260px] text-[13px]">
        Elige una en la lista para ver su vista previa, variables y botones. Usa ↑ y ↓ para moverte.
      </p>
    </div>
  );
}

export function DetailPanel({
  template,
  wabaId,
  wabaName,
  variants,
  onSelectVariant,
  compared,
  compareDisabled,
  onToggleCompare,
  onCompareLanguages,
}: DetailPanelProps) {
  // Kept across templates so you can go through several looking at the same tab.
  const [tab, setTab] = useState<Tab>("preview");
  const [mode, setMode] = useState<PreviewMode>("template");

  if (!template || !wabaId) return <PanelEmpty />;

  const tabs: { id: Tab; label: string }[] = [
    { id: "preview", label: "Vista previa" },
    { id: "variables", label: `Variables (${extractVariables(template).length})` },
    { id: "buttons", label: `Botones (${countButtons(template)})` },
    { id: "info", label: "Información" },
  ];

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = (index + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
    setTab(tabs[next].id);
    document.getElementById(`tab-${tabs[next].id}`)?.focus();
  };

  return (
    <div className="px-5 py-5 sm:px-7">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <div className="min-w-0 flex-[1_1_260px]">
          <h1 className="font-mono text-[17px] leading-snug font-medium break-all">
            <Highlight text={template.name} />
          </h1>
          <p className="text-muted mt-1 text-[13px]">{wabaName}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CopyButton value={template.name} label="Copiar nombre" />
          <button
            type="button"
            onClick={onToggleCompare}
            disabled={compareDisabled}
            aria-pressed={compared}
            className={`h-8 rounded-lg border px-2.5 text-xs font-medium disabled:opacity-40 ${
              compared
                ? "border-accent bg-accent-soft text-accent-ink"
                : "border-line-strong bg-surface hover:border-accent hover:text-accent-ink"
            }`}
          >
            {compared ? "En la comparación ✓" : "Comparar"}
          </button>
          <a
            href={metaTemplateUrl(wabaId, template.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-ink hover:bg-ink/85 flex h-8 items-center rounded-lg px-2.5 text-xs font-medium text-white"
          >
            Abrir en Meta ↗
          </a>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <TemplateBadges template={template} />
        {variants.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-muted text-xs">Idioma</span>
            <div role="group" aria-label="Idioma" className="border-line-strong flex overflow-hidden rounded-lg border">
              {variants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onSelectVariant(v)}
                  aria-pressed={v.id === template.id}
                  className={`${segmented(v.id === template.id)} border-line-strong border-l font-mono first:border-l-0`}
                >
                  {v.language}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onCompareLanguages}
              className="text-accent-ink text-xs font-medium hover:underline"
            >
              Comparar idiomas
            </button>
          </div>
        )}
      </div>

      <div
        role="tablist"
        aria-label="Detalle de la plantilla"
        className="border-line mt-4 flex gap-5 overflow-x-auto border-b"
      >
        {tabs.map((t, i) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            onKeyDown={(e) => onTabKey(e, i)}
            className={`-mb-px shrink-0 border-b-2 py-2.5 text-[13px] whitespace-nowrap ${
              tab === t.id ? "border-accent font-semibold" : "text-muted hover:text-ink border-transparent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="pt-5">
        {tab === "preview" && (
          <div className="max-w-[460px]">
            {hasExamples(template) && (
              <div
                role="group"
                aria-label="Modo de la vista previa"
                className="border-line-strong mb-3 inline-flex overflow-hidden rounded-lg border"
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
            )}
            <div className="overflow-hidden rounded-2xl">
              <WhatsAppPreview key={template.id} components={template.components ?? []} mode={mode} />
            </div>
          </div>
        )}
        {tab === "variables" && <VariablesTab template={template} />}
        {tab === "buttons" && <ButtonsTab template={template} />}
        {tab === "info" && <InfoTab template={template} wabaName={wabaName} />}
      </div>
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import type { Template, PreviewMode } from "@/types/template";
import { WhatsAppPreview } from "./WhatsAppPreview";

interface DetailPanelProps {
  template: Template | null;
  wabaId: string | null;
  wabaName: string;
}

const STATUS_STYLES: Record<string, string> = {
  APPROVED: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  PENDING: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  REJECTED: "bg-red-50 text-red-700 ring-1 ring-red-200",
};

function hasExamples(template: Template): boolean {
  return (
    template.components?.some(
      (c) =>
        c.text &&
        /\{\{\w+\}\}/.test(c.text) &&
        ((c.type === "BODY" && (c.example?.body_text?.[0]?.length ?? 0) > 0) ||
          (c.type === "HEADER" && (c.example?.header_text?.length ?? 0) > 0))
    ) ?? false
  );
}

function PanelEmpty() {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
        <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      </div>
      <p className="font-display text-sm font-semibold text-gray-500">
        Selecciona un template
      </p>
      <p className="mt-1 text-xs text-gray-400">
        Haz click en un template de la lista para ver su detalle
      </p>
    </div>
  );
}

function PanelContent({ template, wabaId, wabaName }: { template: Template; wabaId: string; wabaName: string }) {
  const [mode, setMode] = useState<PreviewMode>("template");
  const showToggle = useMemo(() => hasExamples(template), [template]);

  return (
    <div className="flex flex-col">
      {/* Zone 1: Header */}
      <div className="shrink-0 border-b border-gray-100 px-5 py-4">
        <p className="font-display break-words text-sm font-bold leading-snug text-gray-900">
          {template.name}
        </p>
        <p className="mt-1 text-xs text-gray-400">{wabaName}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span
            className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[template.status] ?? "bg-gray-100 text-gray-500"}`}
          >
            {template.status}
          </span>
          <span className="inline-block rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 ring-1 ring-indigo-200">
            {template.category}
          </span>
          <span className="inline-block rounded-md bg-gray-50 px-2 py-0.5 text-[10px] font-semibold text-gray-500 ring-1 ring-gray-200">
            {template.language}
          </span>
        </div>

        {showToggle && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[11px] font-medium text-gray-400">Vista:</span>
            <button
              onClick={() => setMode("template")}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-all ${
                mode === "template"
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              Template
            </button>
            <button
              onClick={() => setMode("example")}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-all ${
                mode === "example"
                  ? "bg-teal-600 text-white"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              Ejemplo
            </button>
          </div>
        )}
      </div>

      {/* Zone 2: Content */}
      <div>
        <WhatsAppPreview components={template.components ?? []} mode={mode} />
      </div>

      {/* Zone 3: Actions */}
      <div className="border-t border-gray-100 px-5 py-3">
        <a
          href={`https://business.facebook.com/wa/manage/message-templates/?waba_id=${wabaId}&id=${template.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-500 transition-colors hover:border-teal-600 hover:bg-teal-50 hover:text-teal-600"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
          Ver en Meta
        </a>
      </div>
    </div>
  );
}

export function DetailPanel({ template, wabaId, wabaName }: DetailPanelProps) {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
      {template && wabaId ? (
        <PanelContent key={template.id} template={template} wabaId={wabaId} wabaName={wabaName} />
      ) : (
        <PanelEmpty />
      )}
    </div>
  );
}

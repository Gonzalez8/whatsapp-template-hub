"use client";

import { useState } from "react";
import type { Template, PreviewMode } from "@/types/template";
import { WhatsAppPreview } from "./WhatsAppPreview";
import { STATUS_STYLES, hasExamples } from "@/lib/template-utils";

interface DetailPanelProps {
  template: Template | null;
  wabaId: string | null;
  wabaName: string;
}

function PanelEmpty() {
  return (
    <div className="flex min-h-[340px] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 ring-1 ring-gray-200/60">
        <svg className="h-7 w-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      </div>
      <p className="font-display text-[14px] font-bold text-gray-600">
        Selecciona un template
      </p>
      <p className="mt-1.5 max-w-[200px] text-[12px] leading-relaxed text-gray-500">
        Haz click en un template de la lista para ver su detalle y vista previa
      </p>
    </div>
  );
}

function PanelContent({ template, wabaId, wabaName }: { template: Template; wabaId: string; wabaName: string }) {
  const [mode, setMode] = useState<PreviewMode>("template");
  const showToggle = hasExamples(template);

  return (
    <div className="flex flex-col">
      {/* Zone 1: Header */}
      <div className="shrink-0 border-b border-gray-100 px-5 py-4">
        <p className="font-display break-words text-[14px] font-bold leading-snug text-gray-900">
          {template.name}
        </p>
        <p className="mt-1 text-[11px] font-medium text-gray-500">{wabaName}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span
            className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[template.status] ?? "bg-gray-100 text-gray-500"}`}
          >
            {template.status}
          </span>
          <span className="inline-block rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 ring-1 ring-indigo-600/10">
            {template.category}
          </span>
          <span className="inline-block rounded-md bg-gray-50 px-2 py-0.5 text-[10px] font-semibold text-gray-500 ring-1 ring-gray-900/[0.06]">
            {template.language}
          </span>
        </div>

        {showToggle && (
          <div className="mt-3.5 flex items-center gap-1">
            <div className="flex rounded-full bg-gray-100/80 p-0.5">
              <button
                onClick={() => setMode("template")}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-all duration-200 ${
                  mode === "template"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Template
              </button>
              <button
                onClick={() => setMode("example")}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-all duration-200 ${
                  mode === "example"
                    ? "bg-teal-600 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Ejemplo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Zone 2: Content */}
      <div>
        <WhatsAppPreview components={template.components ?? []} mode={mode} />
      </div>

      {/* Zone 3: Actions */}
      <div className="border-t border-gray-100 px-5 py-3.5">
        <a
          href={`https://business.facebook.com/wa/manage/message-templates/?waba_id=${encodeURIComponent(wabaId)}&id=${encodeURIComponent(template.id)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-gray-200/80 px-4 py-2.5 text-sm font-semibold text-gray-500 transition-all duration-200 hover:border-teal-500 hover:bg-teal-50 hover:text-teal-600 sm:min-h-0 sm:text-xs"
        >
          <svg className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm ring-1 ring-gray-900/[0.03] lg:rounded-2xl">
      {template && wabaId ? (
        <PanelContent key={template.id} template={template} wabaId={wabaId} wabaName={wabaName} />
      ) : (
        <PanelEmpty />
      )}
    </div>
  );
}

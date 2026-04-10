"use client";

import { useState } from "react";
import type { Template, PreviewMode } from "@/types/template";
import { WhatsAppPreview } from "./WhatsAppPreview";
import { STATUS_STYLES, hasExamples } from "@/lib/template-utils";

interface TemplateCardProps {
  template: Template;
  wabaId: string;
  index?: number;
}

export function TemplateCard({ template, wabaId, index = 0 }: TemplateCardProps) {
  const [mode, setMode] = useState<PreviewMode>("template");
  const showToggle = hasExamples(template);

  return (
    <div
      className="card-enter group flex flex-col overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-sm ring-1 ring-gray-900/[0.03] transition-all duration-300 hover:-translate-y-0.5 hover:border-gray-200 hover:shadow-lg hover:shadow-gray-900/[0.07]"
      style={{ animationDelay: `${Math.min(index, 10) * 60}ms` }}
    >
      <div className="px-4 pt-4 pb-3">
        <div className="mb-3 flex items-start justify-between gap-2">
          <p className="font-display break-words text-[13px] font-bold leading-snug text-gray-900">
            {template.name}
          </p>
          {showToggle && (
            <button
              onClick={() =>
                setMode((m) => (m === "template" ? "example" : "template"))
              }
              aria-label={
                mode === "template" ? "Ver con ejemplos" : "Ver template original"
              }
              className={`flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-all duration-200 ${
                mode === "example"
                  ? "border-teal-400/60 bg-teal-50 text-teal-700"
                  : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 hover:bg-gray-100"
              }`}
            >
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full transition-colors duration-200 ${
                  mode === "example" ? "bg-teal-500" : "bg-gray-300"
                }`}
              />
              {mode === "example" ? "Ejemplo" : "Template"}
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
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
      </div>

      <div className="flex-1 bg-[#efeae2]">
        <WhatsAppPreview components={template.components ?? []} mode={mode} />
      </div>

      <a
        href={`https://business.facebook.com/wa/manage/message-templates/?waba_id=${encodeURIComponent(wabaId)}&id=${encodeURIComponent(template.id)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto flex min-h-[44px] items-center justify-center gap-1.5 border-t border-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-400 transition-all duration-200 hover:bg-gray-50 hover:text-teal-600 sm:min-h-0 sm:text-xs"
      >
        <svg className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
        </svg>
        Ver en Meta
      </a>
    </div>
  );
}

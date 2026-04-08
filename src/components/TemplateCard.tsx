"use client";

import { useState, useMemo } from "react";
import type { Template, PreviewMode } from "@/types/template";
import { WhatsAppPreview } from "./WhatsAppPreview";

interface TemplateCardProps {
  template: Template;
}

const STATUS_STYLES: Record<string, string> = {
  APPROVED: "bg-emerald-50 text-emerald-700",
  PENDING: "bg-amber-50 text-amber-700",
  REJECTED: "bg-red-50 text-red-700",
};

function hasVariables(template: Template): boolean {
  return (
    template.components?.some(
      (c) => c.text && /\{\{\w+\}\}/.test(c.text)
    ) ?? false
  );
}

export function TemplateCard({ template }: TemplateCardProps) {
  const [mode, setMode] = useState<PreviewMode>("template");
  const showToggle = useMemo(() => hasVariables(template), [template]);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="px-4 pt-3.5 pb-3">
        <div className="mb-2 flex items-start justify-between gap-2">
          <p className="break-words text-sm font-semibold text-gray-900">
            {template.name}
          </p>
          {showToggle && (
            <button
              onClick={() =>
                setMode((m) => (m === "template" ? "example" : "template"))
              }
              aria-label={
                mode === "template"
                  ? "Ver con ejemplos"
                  : "Ver template original"
              }
              className={`flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-all ${
                mode === "example"
                  ? "border-teal-500 bg-teal-50 text-teal-700"
                  : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300"
              }`}
            >
              <span
                className={`inline-block h-2 w-2 rounded-full transition-colors ${
                  mode === "example" ? "bg-teal-500" : "bg-gray-300"
                }`}
              />
              {mode === "example" ? "Ejemplo" : "Template"}
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span
            className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[template.status] ?? "bg-gray-100 text-gray-500"}`}
          >
            {template.status}
          </span>
          <span className="inline-block rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-600">
            {template.category}
          </span>
          <span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500">
            {template.language}
          </span>
        </div>
      </div>

      <WhatsAppPreview components={template.components ?? []} mode={mode} />
    </div>
  );
}

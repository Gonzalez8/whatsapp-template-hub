import type { Template, PreviewMode } from "@/types/template";
import { WhatsAppPreview } from "./WhatsAppPreview";

interface TemplateCardProps {
  template: Template;
  previewMode: PreviewMode;
}

const STATUS_STYLES: Record<string, string> = {
  APPROVED: "bg-emerald-50 text-emerald-700",
  PENDING: "bg-amber-50 text-amber-700",
  REJECTED: "bg-red-50 text-red-700",
};

export function TemplateCard({ template, previewMode }: TemplateCardProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="px-4 pt-3.5 pb-3">
        <p className="mb-2 break-words text-sm font-semibold text-gray-900">
          {template.name}
        </p>
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

      <WhatsAppPreview components={template.components ?? []} mode={previewMode} />
    </div>
  );
}

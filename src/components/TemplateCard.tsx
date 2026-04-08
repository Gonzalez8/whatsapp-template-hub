import type { Template } from "@/types/template";
import { WhatsAppPreview } from "./WhatsAppPreview";

interface TemplateCardProps {
  template: Template;
}

const STATUS_STYLES: Record<string, string> = {
  APPROVED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  PENDING: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  REJECTED: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
};

export function TemplateCard({ template }: TemplateCardProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800">
      <div className="px-4 pt-3.5 pb-3">
        <p className="mb-2 break-words text-sm font-semibold text-gray-900 dark:text-gray-100">
          {template.name}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <span
            className={`inline-block rounded px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[template.status] ?? "bg-gray-100 text-gray-500"}`}
          >
            {template.status}
          </span>
          <span className="inline-block rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
            {template.category}
          </span>
          <span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500 dark:bg-gray-700 dark:text-gray-400">
            {template.language}
          </span>
        </div>
      </div>

      <WhatsAppPreview components={template.components ?? []} />
    </div>
  );
}

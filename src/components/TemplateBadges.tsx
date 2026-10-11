import type { Template } from "@/types/template";
import { STATUS_STYLES, isRecategorized } from "@/lib/template-utils";

/** Status, category, language and the "recategorized by Meta" warning. */
export function TemplateBadges({ template }: { template: Template }) {
  return (
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
      {isRecategorized(template) && (
        <span
          title={`Meta cambió la categoría de ${template.previous_category} a ${template.category}. Afecta al coste de cada envío.`}
          className="inline-block rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-600/15"
        >
          Antes {template.previous_category}
        </span>
      )}
    </div>
  );
}

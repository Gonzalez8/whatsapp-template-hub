import type { Template } from "@/types/template";
import { CATEGORY_LABELS, STATUS_LABELS, STATUS_STYLES, isRecategorized, label } from "@/lib/template-utils";

const pill = "inline-block rounded-full px-2 py-0.5 text-xs font-medium";

/** Status, category and the "recategorized by Meta" warning. */
export function TemplateBadges({ template }: { template: Template }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className={`${pill} ${STATUS_STYLES[template.status] ?? "bg-canvas text-muted"}`}>
        {label(STATUS_LABELS, template.status)}
      </span>
      <span className={`${pill} bg-canvas text-ink/80`}>{label(CATEGORY_LABELS, template.category)}</span>
      {isRecategorized(template) && (
        <span
          title={`Meta cambió la categoría de ${template.previous_category} a ${template.category}. Afecta al coste de cada envío.`}
          className={`${pill} bg-amber-50 text-amber-800`}
        >
          Antes {label(CATEGORY_LABELS, template.previous_category!)}
        </span>
      )}
    </div>
  );
}

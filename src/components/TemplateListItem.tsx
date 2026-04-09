import type { Template } from "@/types/template";

interface TemplateListItemProps {
  template: Template;
  selected: boolean;
  onSelect: () => void;
}

const STATUS_DOT: Record<string, string> = {
  APPROVED: "bg-emerald-500",
  PENDING: "bg-amber-500",
  REJECTED: "bg-red-500",
};

export function TemplateListItem({ template, selected, onSelect }: TemplateListItemProps) {
  return (
    <button
      onClick={onSelect}
      className={`flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3 text-left transition-colors last:border-b-0 ${
        selected
          ? "bg-teal-50"
          : "hover:bg-gray-50"
      }`}
    >
      {/* Status dot */}
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[template.status] ?? "bg-gray-300"}`}
        title={template.status}
      />

      {/* Name */}
      <span className={`min-w-0 flex-1 truncate text-[13px] font-medium ${
        selected ? "font-semibold text-teal-900" : "text-gray-800"
      }`}>
        {template.name}
      </span>

      {/* Category */}
      <span className="hidden shrink-0 text-[11px] text-gray-400 sm:block">
        {template.category}
      </span>

      {/* Language */}
      <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
        {template.language}
      </span>
    </button>
  );
}

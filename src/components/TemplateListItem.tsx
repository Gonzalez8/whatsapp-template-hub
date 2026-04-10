import type { Template } from "@/types/template";
import { STATUS_DOT } from "@/lib/template-utils";

interface TemplateListItemProps {
  template: Template;
  selected: boolean;
  onSelect: () => void;
}

export function TemplateListItem({ template, selected, onSelect }: TemplateListItemProps) {
  return (
    <button
      onClick={onSelect}
      className={`group flex min-h-[44px] w-full items-center gap-3 border-b border-gray-100/80 px-4 py-3 text-left transition-all duration-150 last:border-b-0 active:bg-gray-100 ${
        selected ? "border-l-2 border-l-teal-500 bg-teal-50/70 pl-[14px]" : "hover:bg-gray-50/70"
      }`}
    >
      {/* Status dot */}
      <span
        className={`h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white sm:h-2 sm:w-2 ${STATUS_DOT[template.status] ?? "bg-gray-300"}`}
        title={template.status}
      />

      {/* Name */}
      <span
        className={`min-w-0 flex-1 truncate text-sm transition-colors duration-150 sm:text-[13px] ${
          selected ? "font-semibold text-teal-900" : "font-medium text-gray-700 group-hover:text-gray-900"
        }`}
      >
        {template.name}
      </span>

      {/* Category */}
      <span className="hidden shrink-0 text-[11px] text-gray-400 sm:block">{template.category}</span>

      {/* Language */}
      <span
        className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-colors duration-150 ${
          selected ? "bg-teal-100/60 text-teal-700" : "bg-gray-100 text-gray-500"
        }`}
      >
        {template.language}
      </span>

      {/* Mobile chevron hint */}
      <svg className="h-4 w-4 shrink-0 text-gray-300 lg:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m9 5 7 7-7 7" />
      </svg>
    </button>
  );
}

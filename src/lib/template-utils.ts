import type { Template } from "@/types/template";

export const STATUS_STYLES: Record<string, string> = {
  APPROVED: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10",
  PENDING: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/10",
  REJECTED: "bg-red-50 text-red-700 ring-1 ring-red-600/10",
};

export const STATUS_DOT: Record<string, string> = {
  APPROVED: "bg-emerald-500",
  PENDING: "bg-amber-500",
  REJECTED: "bg-red-500",
};

export function hasExamples(template: Template): boolean {
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

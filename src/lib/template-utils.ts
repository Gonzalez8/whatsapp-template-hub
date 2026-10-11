import type { Template, TemplateComponent } from "@/types/template";

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

/** Positional values ({{1}}, {{2}}…) or named values ({{first_name}}…). */
export type ExampleValues = string[] | Record<string, string>;

/** Example values Meta stores for a component's variables, in either parameter format. */
export function getExampleValues(component: TemplateComponent): ExampleValues | undefined {
  const ex = component.example;
  if (!ex) return undefined;

  const named = component.type === "BODY" ? ex.body_text_named_params : ex.header_text_named_params;
  if (named?.length) return Object.fromEntries(named.map((p) => [p.param_name, p.example]));

  const positional = component.type === "BODY" ? ex.body_text?.[0] : ex.header_text;
  return positional?.length ? positional : undefined;
}

/** Replaces {{1}} / {{name}} with example values, leaving unknown variables untouched. */
export function replaceVariables(text: string, values: ExampleValues | undefined): string {
  if (!values) return text;
  let position = 0;
  return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const index = /^\d+$/.test(key) ? Number(key) - 1 : position;
    position++;
    // Named variables with positional examples are resolved by order of appearance.
    const value = Array.isArray(values) ? values[index] : values[key];
    return value ?? match;
  });
}

export function hasExamples(template: Template): boolean {
  return (
    template.components?.some(
      (c) =>
        (c.type === "BODY" || c.type === "HEADER") &&
        !!c.text &&
        /\{\{\w+\}\}/.test(c.text) &&
        getExampleValues(c) !== undefined,
    ) ?? false
  );
}

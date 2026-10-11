import type { PreviewMode, Template, TemplateComponent } from "@/types/template";

export const STATUS_STYLES: Record<string, string> = {
  APPROVED: "bg-emerald-50 text-emerald-800",
  PENDING: "bg-amber-50 text-amber-800",
  REJECTED: "bg-red-50 text-red-700",
  PAUSED: "bg-amber-50 text-amber-800",
  DISABLED: "bg-gray-100 text-gray-700",
};

export const STATUS_LABELS: Record<string, string> = {
  APPROVED: "Aprobada",
  PENDING: "Pendiente",
  REJECTED: "Rechazada",
  PAUSED: "Pausada",
  DISABLED: "Deshabilitada",
  IN_APPEAL: "En apelación",
};

export const CATEGORY_LABELS: Record<string, string> = {
  MARKETING: "Marketing",
  UTILITY: "Utilidad",
  AUTHENTICATION: "Autenticación",
};

export const label = (labels: Record<string, string>, value: string) => labels[value] ?? value;

export const HEADER_FORMAT_LABELS: Record<string, string> = {
  IMAGE: "Imagen",
  VIDEO: "Vídeo",
  DOCUMENT: "Documento",
  LOCATION: "Ubicación",
};

/** "Imagen", "Vídeo"… for media headers; undefined for text or no header. */
export function headerKind(template: Template): string | undefined {
  const format = template.components?.find((c) => c.type === "HEADER")?.format;
  return format ? HEADER_FORMAT_LABELS[format] : undefined;
}

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

/**
 * Example value of the variable `key`, the `position`-th variable of its text.
 * Named variables with positional examples are resolved by order of appearance.
 */
function exampleFor(values: ExampleValues | undefined, key: string, position: number): string | undefined {
  if (!values) return undefined;
  if (!Array.isArray(values)) return values[key];
  return values[/^\d+$/.test(key) ? Number(key) - 1 : position];
}

/** Replaces {{1}} / {{name}} with example values, leaving unknown variables untouched. */
export function replaceVariables(text: string, values: ExampleValues | undefined): string {
  if (!values) return text;
  let position = 0;
  return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) => exampleFor(values, key, position++) ?? match);
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

const CURRENT_CATEGORIES = new Set(["MARKETING", "UTILITY", "AUTHENTICATION"]);

/**
 * True when Meta moved the template to another current category (e.g. UTILITY → MARKETING).
 * Legacy values such as TICKET_UPDATE come from Meta's old category scheme and are ignored.
 */
export function isRecategorized(template: Template): boolean {
  const prev = template.previous_category;
  return !!prev && CURRENT_CATEGORIES.has(prev) && prev !== template.category;
}

export const BUTTON_TYPE_LABELS: Record<string, string> = {
  URL: "Enlace",
  PHONE_NUMBER: "Llamada",
  QUICK_REPLY: "Respuesta rápida",
  FLOW: "Flow",
  COPY_CODE: "Copiar código",
  OTP: "Código OTP",
};

export interface TemplateVariable {
  /** As written in the template, e.g. "{{1}}" or "{{lead_name}}". */
  token: string;
  example?: string;
  /** Where it appears: "Cabecera", "Cuerpo" or "Botón «Ver curso»". */
  location: string;
}

const VARIABLE = /\{\{(\w+)\}\}/g;

/** Every variable of the template, in order of appearance, with its example value. */
export function extractVariables(template: Template): TemplateVariable[] {
  const vars: TemplateVariable[] = [];

  for (const c of template.components ?? []) {
    if ((c.type === "HEADER" || c.type === "BODY") && c.text) {
      const values = getExampleValues(c);
      let position = 0;
      for (const [token, key] of c.text.matchAll(VARIABLE)) {
        vars.push({
          token,
          example: exampleFor(values, key, position++),
          location: c.type === "HEADER" ? "Cabecera" : "Cuerpo",
        });
      }
    }

    for (const b of c.buttons ?? []) {
      if (!b.url) continue;
      for (const [token] of b.url.matchAll(VARIABLE)) {
        // Meta gives the whole example URL, not just the variable's value.
        vars.push({ token, example: b.example?.[0], location: `Botón «${b.text}»` });
      }
    }
  }

  return vars;
}

/** A component's text as the preview shows it: raw, or with the example values filled in. */
export function resolveComponentText(component: TemplateComponent | undefined, mode: PreviewMode): string | undefined {
  if (!component?.text) return undefined;
  if (mode === "template") return component.text;
  return replaceVariables(component.text, getExampleValues(component));
}

/** The template in Meta's WhatsApp Manager, where it can be edited. */
export function metaTemplateUrl(wabaId: string, templateId: string): string {
  return `https://business.facebook.com/wa/manage/message-templates/?waba_id=${encodeURIComponent(wabaId)}&id=${encodeURIComponent(templateId)}`;
}

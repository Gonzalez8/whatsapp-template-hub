import type { Template } from "@/types/template";

/** The language variants of one template: Meta identifies a template by name + language. */
export interface TemplateFamily {
  name: string;
  /** Sorted by language code. */
  variants: Template[];
}

/** Groups templates by name, keeping the order in which each name first appears. */
export function groupByName(templates: Template[]): TemplateFamily[] {
  const byName = new Map<string, Template[]>();
  for (const t of templates) {
    const list = byName.get(t.name);
    if (list) list.push(t);
    else byName.set(t.name, [t]);
  }
  return Array.from(byName, ([name, variants]) => ({
    name,
    variants: [...variants].sort((a, b) => a.language.localeCompare(b.language)),
  }));
}

/**
 * The variant to open for a family: the one in `preferredLanguage` if it exists
 * (so browsing keeps the language you were looking at), else the first.
 */
export function pickVariant(family: TemplateFamily, preferredLanguage?: string): Template {
  return family.variants.find((v) => v.language === preferredLanguage) ?? family.variants[0];
}

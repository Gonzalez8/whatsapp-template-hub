import type { Template } from "@/types/template";

export type Range = [start: number, end: number];

/**
 * Lowercases, strips accents and turns "_" into spaces, keeping for every
 * character of the result the index of the original character it came from.
 * The map lets matches found in the normalized text be highlighted in the original.
 */
function normalizeWithMap(text: string): { norm: string; map: number[] } {
  let norm = "";
  const map: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const n = ch === "_" ? " " : ch.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    for (let j = 0; j < n.length; j++) {
      norm += n[j];
      map.push(i);
    }
  }
  return { norm, map };
}

export function normalize(text: string): string {
  return normalizeWithMap(text).norm;
}

/** Splits a query into normalized terms; every term must match (in any order). */
export function parseQuery(query: string): string[] {
  return normalize(query).split(/\s+/).filter(Boolean);
}

/** Every piece of text a template can be found by, in display order. */
export function templateContentParts(template: Template): string[] {
  const parts: string[] = [];
  for (const c of template.components ?? []) {
    if (c.text) parts.push(c.text);
    for (const b of c.buttons ?? []) {
      parts.push(b.text);
      if (b.url) parts.push(b.url);
      if (b.phone_number) parts.push(b.phone_number);
    }
  }
  return parts;
}

/** Normalized text used to filter a template. */
export function buildSearchText(template: Template, wabaName: string): string {
  return normalize(
    [
      template.name,
      template.id,
      template.language,
      template.category,
      wabaName,
      ...templateContentParts(template),
    ].join("\n"),
  );
}

export function matchesTerms(searchText: string, terms: string[]): boolean {
  return terms.every((term) => searchText.includes(term));
}

/** Ranges of `text` (original indices, end exclusive) matching any term, sorted and merged. */
export function findMatchRanges(text: string, terms: string[]): Range[] {
  if (terms.length === 0 || !text) return [];
  const { norm, map } = normalizeWithMap(text);
  const ranges: Range[] = [];

  for (const term of terms) {
    let from = 0;
    let idx: number;
    while ((idx = norm.indexOf(term, from)) !== -1) {
      ranges.push([map[idx], map[idx + term.length - 1] + 1]);
      from = idx + term.length;
    }
  }

  ranges.sort((a, b) => a[0] - b[0]);
  const merged: Range[] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([r[0], r[1]]);
  }
  return merged;
}

export interface Snippet {
  text: string;
  ranges: Range[];
}

/**
 * A short excerpt of `text` around its first match, with ranges relative to the
 * excerpt. Returns null when nothing matches.
 */
export function buildSnippet(text: string, terms: string[], radius = 40): Snippet | null {
  const ranges = findMatchRanges(text, terms);
  if (ranges.length === 0) return null;

  const start = Math.max(0, ranges[0][0] - radius);
  const end = Math.min(text.length, ranges[0][1] + radius * 2);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  const offset = prefix.length - start;

  return {
    // Newlines become spaces one-to-one so ranges stay valid; HTML collapses repeated spaces.
    text: prefix + text.slice(start, end).replace(/\s/g, " ") + suffix,
    ranges: ranges.filter(([s, e]) => s >= start && e <= end).map(([s, e]) => [s + offset, e + offset] as Range),
  };
}

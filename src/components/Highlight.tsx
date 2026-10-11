"use client";

import { createContext, useContext, type ReactNode } from "react";
import { findMatchRanges, type Range } from "@/lib/search";

/** Normalized terms of the active search, so any component can highlight them. */
const SearchTermsContext = createContext<string[]>([]);

export const SearchTermsProvider = SearchTermsContext.Provider;

export function useSearchTerms(): string[] {
  return useContext(SearchTermsContext);
}

export function renderHighlighted(text: string, ranges: Range[]): ReactNode {
  if (ranges.length === 0) return text;

  const out: ReactNode[] = [];
  let last = 0;
  for (const [start, end] of ranges) {
    if (start > last) out.push(text.slice(last, start));
    out.push(
      <mark key={start} className="rounded-sm bg-amber-200/80 text-inherit">
        {text.slice(start, end)}
      </mark>,
    );
    last = end;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Text with the active search terms highlighted. */
export function Highlight({ text }: { text: string }) {
  const terms = useSearchTerms();
  return <>{renderHighlighted(text, findMatchRanges(text, terms))}</>;
}

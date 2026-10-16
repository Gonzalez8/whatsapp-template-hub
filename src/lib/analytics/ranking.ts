// Shared by server and client: ordering and flagging of the templates table.

import { rates, type ReadCounts, type TemplateRow } from "./types";

/** Below this many sends a rate swings too much (one failure in 8 is 12 points) to flag or rank it. */
export const MIN_SENDS_TO_RATE = 100;
/** How far below the selection's average a rate must fall to be flagged. */
export const DELIVERY_GAP = 0.05;
export const READ_GAP = 0.1;

export const RANKING_SORT_KEYS = ["sent", "delivery", "read", "readMedian", "failed"] as const;
export type RankingSortKey = (typeof RANKING_SORT_KEYS)[number];
export interface RankingSort {
  key: RankingSortKey;
  direction: "desc" | "asc";
}

const isRate = (key: RankingSortKey) => key === "delivery" || key === "read";

/** Whether the row's rate is worth ranking: enough sends, or a column that isn't a rate. */
export const isRanked = (row: TemplateRow, key: RankingSortKey) => !isRate(key) || row.sent >= MIN_SENDS_TO_RATE;

function value(row: TemplateRow, key: RankingSortKey): number | null {
  if (key === "delivery" || key === "read") return rates(row)[key];
  return row[key];
}

/**
 * Templates in the given order. Ordered by a rate, those with too few sends go after the
 * rest, ordered the same way among themselves, so a template sent 3 times at 66 % doesn't
 * top the list. Missing values always go last; ties keep the most sent first.
 */
export function sortTemplates(rows: readonly TemplateRow[], { key, direction }: RankingSort): TemplateRow[] {
  const sign = direction === "desc" ? -1 : 1;
  return [...rows].sort((a, b) => {
    if (isRanked(a, key) !== isRanked(b, key)) return isRanked(a, key) ? -1 : 1;
    const va = value(a, key);
    const vb = value(b, key);
    if (va === null || vb === null) return va === vb ? b.sent - a.sent : va === null ? 1 : -1;
    return (va - vb) * sign || b.sent - a.sent;
  });
}

export interface LowRate {
  rate: number;
  average: number;
}

/**
 * The template's delivery and read rates when they fall well below the average of what
 * is on screen: a quick pointer to where something is going wrong (the template, its
 * parameters or who it is sent to). Null when not flagged or too few sends.
 */
export function lowRates(row: TemplateRow, totals: ReadCounts): { delivery: LowRate | null; read: LowRate | null } {
  const own = rates(row);
  const average = rates(totals);
  // The 1e-9 absorbs float noise: 0.95 − 0.90 is 0.0499….
  const flag = (rate: number | null, avg: number | null, gap: number): LowRate | null =>
    row.sent >= MIN_SENDS_TO_RATE && rate !== null && avg !== null && avg - rate >= gap - 1e-9
      ? { rate, average: avg }
      : null;
  return {
    delivery: flag(own.delivery, average.delivery, DELIVERY_GAP),
    read: flag(own.read, average.read, READ_GAP),
  };
}

// Shared by server and client: keep this module free of server-only imports.

export const ANALYTICS_RANGES = ["7d", "30d", "90d", "all"] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

export interface Counts {
  /** Send attempts (sent or rejected before reaching Meta). */
  sent: number;
  /** Delivered or read. */
  delivered: number;
  read: number;
  failed: number;
  /** Failed for a reason we can fix (template or data configuration). */
  avoidable: number;
}

export interface ErrorCount {
  code: string;
  failed: number;
  avoidable: boolean;
  label: string;
}

export interface TemplateAnalytics {
  range: AnalyticsRange;
  totals: Counts;
  daily: ({ day: string } & Counts)[];
  errors: ErrorCount[];
  /** Same metrics for the whole WABA in the same range, to compare against. */
  waba: Counts;
}

export interface TemplateRow extends Counts {
  waba: string;
  template: string;
  language: string;
}

export interface MetaVolume {
  total: number;
  paid: number;
  free: number;
  byCategory: Record<string, number>;
}

export interface SummaryAnalytics {
  range: AnalyticsRange;
  totals: Counts;
  daily: { day: string; sent: number }[];
  templates: TemplateRow[];
  errors: ErrorCount[];
  /** All messages Meta counted for the selection, from every source (null if unavailable). */
  meta: MetaVolume | null;
}

/** Delivered / sent and read / delivered, as 0–1 (null when there is nothing to divide). */
export function rates(counts: Counts) {
  return {
    delivery: counts.sent ? counts.delivered / counts.sent : null,
    read: counts.delivered ? counts.read / counts.delivered : null,
  };
}

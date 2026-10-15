// Shared by server and client: keep this module free of server-only imports.

export const ANALYTICS_RANGES = ["7d", "30d", "90d", "all"] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

export const DAY_MS = 86_400_000;
/** Days each range covers; null for the whole history. */
export const RANGE_DAYS: Record<AnalyticsRange, number | null> = { "7d": 7, "30d": 30, "90d": 90, all: null };
/** Meta keeps 90 days of pricing data at most. */
export const META_MAX_DAYS = 90;

/** Where in Salesforce the send came from: Marketing Cloud or Digital Engagement. */
export const ANALYTICS_ORIGINS = ["all", "mce", "de"] as const;
export type AnalyticsOrigin = (typeof ANALYTICS_ORIGINS)[number];

/** Values of the application column for each origin. */
export const ORIGIN_APPLICATIONS = {
  mce: "MARKETING_CLOUD_ENGAGEMENT",
  de: "DIGITAL_ENGAGEMENT",
} as const satisfies Record<Exclude<AnalyticsOrigin, "all">, string>;

/** The origin of an application column value, if it is one of ours. */
export function originOfApplication(application: string): Exclude<AnalyticsOrigin, "all"> | null {
  if (application === ORIGIN_APPLICATIONS.mce) return "mce";
  if (application === ORIGIN_APPLICATIONS.de) return "de";
  return null;
}

/** A stretch of days inside the range (UTC, YYYY-MM-DD, `to` excluded): a day or a week. */
export interface AnalyticsPeriod {
  from: string;
  to: string;
}

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

/** Where the figures were read from, and how fresh that source is. */
export interface DataSource {
  kind: "athena" | "datacloud";
  /** Athena: when the data team last loaded the copy (ISO, UTC); null if unknown. */
  loadedAt: string | null;
}

/** Counts plus the median seconds from send to first read (null when nothing was read). */
export interface ReadCounts extends Counts {
  readMedian: number | null;
}

export interface OriginRow extends ReadCounts {
  /** The application column, e.g. MARKETING_CLOUD_ENGAGEMENT; "" when Salesforce didn't fill it. */
  origin: string;
}

export interface TemplateAnalytics {
  range: AnalyticsRange;
  /** Epoch ms of when the figures were computed (they are cached for an hour). */
  generatedAt: number;
  source: DataSource;
  totals: ReadCounts;
  daily: ({ day: string } & Counts)[];
  errors: ErrorCount[];
  origins: OriginRow[];
  /** Same metrics for the whole WABA in the same range, to compare against. */
  waba: ReadCounts;
}

export interface TemplateRow extends ReadCounts {
  waba: string;
  template: string;
  language: string;
}

export interface MetaVolume {
  total: number;
  paid: number;
  free: number;
  byCategory: Record<string, number>;
  /** Per WABA: templates (every category but SERVICE) and service conversations. */
  byWaba: Record<string, { templates: number; service: number }>;
  /** WABAs Meta didn't answer for: the figures leave them out. */
  missing: string[];
}

/** What Salesforce sent and delivered for one WABA from one origin. */
export interface WabaOriginRow {
  waba: string;
  origin: string;
  sent: number;
  delivered: number;
}

export interface SummaryAnalytics {
  range: AnalyticsRange;
  origin: AnalyticsOrigin;
  /** Set when the figures cover a single day or week of the range. */
  period: AnalyticsPeriod | null;
  /** Epoch ms of when the figures were computed (they are cached for an hour). */
  generatedAt: number;
  source: DataSource;
  totals: ReadCounts;
  origins: OriginRow[];
  wabaOrigins: WabaOriginRow[];
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

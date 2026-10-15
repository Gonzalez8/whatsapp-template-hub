import { unstable_cache } from "next/cache";
import type { Row } from "@/lib/query-error";
import { fetchMetaVolume } from "@/lib/meta-analytics";
import { describeError } from "./errors";
import { getAnalyticsSource } from "./source";
import {
  ORIGIN_APPLICATIONS,
  errorsSql,
  lastLoadSql,
  overviewSql,
  summaryDailySql,
  templateDailySql,
  templateRankingSql,
  wabaOriginSql,
  type Scope,
} from "./queries";
import type {
  AnalyticsOrigin,
  AnalyticsPeriod,
  AnalyticsRange,
  Counts,
  DataSource,
  OriginRow,
  ReadCounts,
  SummaryAnalytics,
  TemplateAnalytics,
  TemplateRow,
} from "./types";

export const ANALYTICS_TAG = "analytics";
/** The events lag behind Meta (Data Cloud ~15 min, the Athena copy a few hours): one hour of cache is plenty. */
const ANALYTICS_REVALIDATE_SECONDS = 3600;

const DAY_MS = 86_400_000;
const RANGE_DAYS: Record<AnalyticsRange, number | null> = { "7d": 7, "30d": 30, "90d": 90, all: null };
/** Meta keeps 90 days of pricing data at most. */
const META_MAX_DAYS = 90;

/** The configured source (Athena or Data Cloud); analytics is only enabled when there is one. */
function source() {
  const current = getAnalyticsSource();
  if (current.kind === "none") throw new Error("No hay origen de datos para la analítica");
  return current;
}

function scopeFor(
  range: AnalyticsRange,
  origin: AnalyticsOrigin = "all",
  period: AnalyticsPeriod | null = null,
  now = new Date(),
): Scope {
  const days = RANGE_DAYS[range];
  const since = days === null ? null : new Date(now.getTime() - days * DAY_MS).toISOString().slice(0, 10);
  return {
    dialect: source().dialect,
    since: period?.from ?? since,
    until: period?.to ?? null,
    origin: origin === "all" ? null : ORIGIN_APPLICATIONS[origin],
  };
}

/**
 * Seconds window for Meta's pricing_analytics: the period, or the range (capped to 90 days).
 * Meta buckets days in the WABA's time zone (Madrid: from 22:00 or 23:00 UTC) and only
 * returns buckets that fit entirely in the window, so it is widened by 12 h on each side:
 * that picks exactly the local days from..to for any time zone within ±12 h of UTC.
 */
function metaWindow(range: AnalyticsRange, period: AnalyticsPeriod | null): [number, number] {
  const HALF_DAY = 43_200;
  const toSeconds = (day: string) => Date.parse(`${day}T00:00:00Z`) / 1000;
  if (period) return [toSeconds(period.from) - HALF_DAY, toSeconds(period.to) + HALF_DAY];
  const end = Math.floor(Date.now() / DAY_MS) * (DAY_MS / 1000);
  return [end - (RANGE_DAYS[range] ?? META_MAX_DAYS) * 86_400 - HALF_DAY, end + HALF_DAY];
}

const num = (value: Row[string]) => Number(value ?? 0) || 0;
const median = (value: Row[string]) => (value === null || value === undefined ? null : Math.round(Number(value)));
const toCounts = (row: Row): Counts => ({
  sent: num(row.sent),
  delivered: num(row.delivered),
  read: num(row.read),
  failed: num(row.failed),
  avoidable: num(row.avoidable),
});
const toReadCounts = (row: Row): ReadCounts => ({ ...toCounts(row), readMedian: median(row.read_median) });
const EMPTY: ReadCounts = { sent: 0, delivered: 0, read: 0, failed: 0, avoidable: 0, readMedian: null };

/** Splits the overview query into the total row and one row per origin. */
function splitOverview(rows: Row[]): { totals: ReadCounts; origins: OriginRow[] } {
  const total = rows.find((row) => row.origin === "__total");
  const origins = rows
    .filter((row) => row.origin !== "__total")
    .map((row) => ({ origin: String(row.origin ?? ""), ...toReadCounts(row) }))
    .sort((a, b) => b.sent - a.sent);
  return { totals: total ? toReadCounts(total) : EMPTY, origins };
}

/**
 * Which source answered, and for a copy (Athena) when it was last loaded. A copy without
 * the load column just reports no time: the figures still come out.
 */
async function describeSource(): Promise<DataSource> {
  const current = source();
  const sql = lastLoadSql(current.dialect);
  const rows = sql ? await current.run(sql).catch(() => []) : [];
  const loaded = rows[0]?.loaded_at;
  // Athena: "2026-10-15 10:51:03.344000" (UTC), to ISO.
  const loadedAt = loaded ? new Date(`${String(loaded).slice(0, 19).replace(" ", "T")}Z`).toISOString() : null;
  return { kind: current.kind === "athena" ? "athena" : "datacloud", loadedAt };
}

/** Data Cloud returns "2026-09-12 00:00:00.000 UTC"; keep the date. */
const day = (value: Row[string]) => String(value ?? "").slice(0, 10);

async function loadSummary(
  wabaIds: string[],
  range: AnalyticsRange,
  origin: AnalyticsOrigin,
  period: AnalyticsPeriod | null,
): Promise<SummaryAnalytics> {
  const scope = scopeFor(range, origin, period);
  const { run } = source();
  const [ranking, daily, errors, overview, wabaOrigins, meta, dataSource] = await Promise.all([
    run(templateRankingSql(scope, wabaIds)),
    run(summaryDailySql(scope, wabaIds)),
    run(errorsSql(scope, wabaIds)),
    run(overviewSql(scope, wabaIds)),
    run(wabaOriginSql(scope, wabaIds)),
    fetchMetaVolume(wabaIds, ...metaWindow(range, period)).catch(() => null),
    describeSource(),
  ]);
  const templates: TemplateRow[] = ranking.map((row) => ({
    waba: String(row.waba),
    template: String(row.template),
    language: String(row.language ?? ""),
    ...toReadCounts(row),
  }));
  return {
    range,
    origin,
    period,
    generatedAt: Date.now(),
    source: dataSource,
    ...splitOverview(overview),
    wabaOrigins: wabaOrigins.map((row) => ({
      waba: String(row.waba),
      origin: String(row.origin ?? ""),
      sent: num(row.sent),
      delivered: num(row.delivered),
    })),
    daily: daily.map((row) => ({ day: day(row.day), sent: num(row.sent) })),
    templates,
    errors: errors.map((row) => describeError(String(row.code ?? "Desconocido"), num(row.failed))),
    meta,
  };
}

async function loadTemplate(
  wabaId: string,
  name: string,
  language: string,
  range: AnalyticsRange,
): Promise<TemplateAnalytics> {
  const scope = scopeFor(range);
  const { run } = source();
  const template = { name, language };
  const [daily, errors, overview, summary] = await Promise.all([
    run(templateDailySql(scope, wabaId, name, language)),
    run(errorsSql(scope, [wabaId], template)),
    run(overviewSql(scope, [wabaId], template)),
    getSummaryAnalytics([wabaId], range),
  ]);
  return {
    range,
    generatedAt: Date.now(),
    source: summary.source,
    ...splitOverview(overview),
    daily: daily.map((row) => ({ day: day(row.day), ...toCounts(row) })),
    errors: errors.map((row) => describeError(String(row.code ?? "Desconocido"), num(row.failed))),
    waba: summary.totals,
  };
}

/** Cached per arguments (WABAs, range, origin and period) for an hour, shared by every instance. */
export const getSummaryAnalytics = unstable_cache(
  (wabaIds: string[], range: AnalyticsRange, origin: AnalyticsOrigin = "all", period: AnalyticsPeriod | null = null) =>
    loadSummary([...wabaIds].sort(), range, origin, period),
  ["analytics-summary-v9"],
  { revalidate: ANALYTICS_REVALIDATE_SECONDS, tags: [ANALYTICS_TAG] },
);

export const getTemplateAnalytics = unstable_cache(
  (wabaId: string, name: string, language: string, range: AnalyticsRange) =>
    loadTemplate(wabaId, name, language.toLowerCase(), range),
  ["analytics-template-v9"],
  { revalidate: ANALYTICS_REVALIDATE_SECONDS, tags: [ANALYTICS_TAG] },
);

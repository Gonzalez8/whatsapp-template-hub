import { unstable_cache } from "next/cache";
import { queryDataCloud, type Row } from "@/lib/datacloud";
import { fetchMetaVolume } from "@/lib/meta-analytics";
import { describeError } from "./errors";
import {
  DEFAULT_WHATSAPP_DLO,
  errorsSql,
  summaryDailySql,
  templateDailySql,
  templateRankingSql,
  type Scope,
} from "./queries";
import type { AnalyticsRange, Counts, SummaryAnalytics, TemplateAnalytics, TemplateRow } from "./types";

export const ANALYTICS_TAG = "analytics";
/** Data Cloud lags ~15 min behind and the data is daily: one hour of cache is plenty. */
const ANALYTICS_REVALIDATE_SECONDS = 3600;

const RANGE_DAYS: Record<AnalyticsRange, number | null> = { "7d": 7, "30d": 30, "90d": 90, all: null };

function scopeFor(range: AnalyticsRange, now = new Date()): Scope {
  const days = RANGE_DAYS[range];
  const since = days === null ? null : new Date(now.getTime() - days * 86_400_000).toISOString().slice(0, 10);
  return { dlo: process.env.DATACLOUD_WHATSAPP_DLO?.trim() || DEFAULT_WHATSAPP_DLO, since };
}

const num = (value: Row[string]) => Number(value ?? 0) || 0;
const toCounts = (row: Row): Counts => ({
  sent: num(row.sent),
  delivered: num(row.delivered),
  read: num(row.read),
  failed: num(row.failed),
  avoidable: num(row.avoidable),
});
const sumCounts = (items: Counts[]): Counts =>
  items.reduce(
    (acc, c) => ({
      sent: acc.sent + c.sent,
      delivered: acc.delivered + c.delivered,
      read: acc.read + c.read,
      failed: acc.failed + c.failed,
      avoidable: acc.avoidable + c.avoidable,
    }),
    { sent: 0, delivered: 0, read: 0, failed: 0, avoidable: 0 },
  );
/** Data Cloud returns "2026-09-12 00:00:00.000 UTC"; keep the date. */
const day = (value: Row[string]) => String(value ?? "").slice(0, 10);

async function loadSummary(wabaIds: string[], range: AnalyticsRange): Promise<SummaryAnalytics> {
  const scope = scopeFor(range);
  const [ranking, daily, errors, meta] = await Promise.all([
    queryDataCloud(templateRankingSql(scope, wabaIds)),
    queryDataCloud(summaryDailySql(scope, wabaIds)),
    queryDataCloud(errorsSql(scope, wabaIds)),
    // Meta keeps 90 days of pricing data at most.
    fetchMetaVolume(wabaIds, RANGE_DAYS[range] ?? 90).catch(() => null),
  ]);
  const templates: TemplateRow[] = ranking.map((row) => ({
    waba: String(row.waba),
    template: String(row.template),
    language: String(row.language ?? ""),
    ...toCounts(row),
  }));
  return {
    range,
    totals: sumCounts(templates),
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
  const template = { name, language };
  const [daily, errors, summary] = await Promise.all([
    queryDataCloud(templateDailySql(scope, wabaId, name, language)),
    queryDataCloud(errorsSql(scope, [wabaId], template)),
    getSummaryAnalytics([wabaId], range),
  ]);
  const days = daily.map((row) => ({ day: day(row.day), ...toCounts(row) }));
  return {
    range,
    totals: sumCounts(days),
    daily: days,
    errors: errors.map((row) => describeError(String(row.code ?? "Desconocido"), num(row.failed))),
    waba: summary.totals,
  };
}

/** Cached per arguments (WABAs and range) for an hour, shared by every instance. */
export const getSummaryAnalytics = unstable_cache(
  (wabaIds: string[], range: AnalyticsRange) => loadSummary([...wabaIds].sort(), range),
  ["analytics-summary"],
  { revalidate: ANALYTICS_REVALIDATE_SECONDS, tags: [ANALYTICS_TAG] },
);

export const getTemplateAnalytics = unstable_cache(
  (wabaId: string, name: string, language: string, range: AnalyticsRange) =>
    loadTemplate(wabaId, name, language.toLowerCase(), range),
  ["analytics-template"],
  { revalidate: ANALYTICS_REVALIDATE_SECONDS, tags: [ANALYTICS_TAG] },
);

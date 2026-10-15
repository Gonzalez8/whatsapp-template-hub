/**
 * SQL for the WhatsApp events Salesforce keeps from Meta's webhooks, either in Data Cloud
 * or in a copy of that table in Amazon Athena (see `Dialect`).
 *
 * One row per event: SEND_STATUS (sent by Salesforce, carries the template payload)
 * and DR (Meta's delivery receipts: sent, delivered, read, failed), all sharing the
 * message's WhatsApp id. Template name and language live inside the message JSON.
 *
 * Every value that ends up in SQL is validated against a strict pattern first.
 */

import { ORIGIN_APPLICATIONS } from "./types";

/**
 * Data Cloud names the object with a suffix of its own in each org. This is the one of
 * the org the app was built for; any other sets `DATACLOUD_WHATSAPP_DLO`.
 */
export const DEFAULT_WHATSAPP_DLO = "MessagingEventsWhatsAppV2_Whats_752DC657__dll";

/** Failures we can fix (template or data configuration), as opposed to noise like numbers without WhatsApp. */
export const AVOIDABLE_ERROR_CODES = [
  "SF-3060",
  "WA-100",
  "WA-132000",
  "WA-132015",
  "WA-132001",
  "WA-131008",
  "WA-131005",
  "WA-190",
  "WA-10",
  // Meta couldn't download the header image or video: usually our URL (expired or private).
  "WA-131053",
] as const;

const WABA_ID = /^\d{1,20}$/;
const TEMPLATE_NAME = /^[a-z0-9_]{1,512}$/;
const LANGUAGE = /^[A-Za-z_]{2,12}$/;
const DLO_NAME = /^[A-Za-z0-9_]{1,200}__dll$/;
const ATHENA_TABLE = /^[a-z0-9_]{1,128}\.[a-z0-9_]{1,128}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class InvalidQueryParam extends Error {
  name = "InvalidQueryParam";
}

function check(value: string, pattern: RegExp, message: string): string {
  if (!pattern.test(value)) throw new InvalidQueryParam(message);
  return value;
}

/** How one source names the event table and its columns, and writes a day literal. */
export interface Dialect {
  table: string;
  wamid: string;
  eventType: string;
  status: string;
  error: string;
  waba: string;
  application: string;
  eventAt: string;
  /** The template name and language, read from the message JSON. */
  templateName: string;
  templateLanguage: string;
  /** A day (YYYY-MM-DD, already validated) comparable with `eventAt`. */
  day(isoDay: string): string;
  /** Whether percentiles work with GROUPING SETS (Athena yes, Data Cloud no). */
  groupingSets: boolean;
  /** Column with the time each row was loaded into a copy, to tell how fresh it is. */
  loadedAt?: string;
}

/** The DLO in Salesforce Data Cloud. Its SQL has no JSON functions, hence the regexes. */
export function dataCloudDialect(dlo: string = DEFAULT_WHATSAPP_DLO): Dialect {
  return {
    table: check(dlo, DLO_NAME, "Objeto de Data Cloud no válido"),
    wamid: "WhatsAppWamId__c",
    eventType: "EventType__c",
    status: "SendStatus__c",
    error: "ErrorCode__c",
    waba: "ExternalAccountId__c",
    application: "Application__c",
    eventAt: "EventDateTime__c",
    // The name of the template object, not just the first "name" in the payload.
    templateName: `regexp_extract(Message__c, '"template":\\{"name":"([^"]+)"', 1)`,
    templateLanguage: `lower(regexp_extract(Message__c, '"language":\\{"code":"([^"]+)"', 1))`,
    day: (isoDay) => `'${isoDay}'`,
    groupingSets: false,
  };
}

/**
 * A copy of the same table in Amazon Athena (`database.table`), with snake_case columns.
 * Copied as the Data Cloud API returns it, the message is HTML-escaped (&quot;…): it is
 * unescaped before reading it as JSON (harmless if it is already plain JSON).
 */
export function athenaDialect(table: string): Dialect {
  const message = `replace(replace(replace(replace(replace(message, '&quot;', '"'), '&#39;', ''''), '&lt;', '<'), '&gt;', '>'), '&amp;', '&')`;
  return {
    table: check(table, ATHENA_TABLE, "Tabla de Athena no válida"),
    wamid: "whatsapp_message_id",
    eventType: "event_type",
    status: "send_status",
    error: "error_code",
    waba: "external_account_id",
    application: "application",
    eventAt: "event_at",
    templateName: `json_extract_scalar(${message}, '$.template.name')`,
    templateLanguage: `lower(json_extract_scalar(${message}, '$.template.language.code'))`,
    day: (isoDay) => `TIMESTAMP '${isoDay} 00:00:00'`,
    groupingSets: true,
    // Load time of each row, if the copy keeps it (optional: see describeSource).
    loadedAt: "_extracted_at",
  };
}

// WhatsApp codes arrive both with the "WA-" prefix and bare ("132000"), depending on the channel.
const AVOIDABLE_LIST = AVOIDABLE_ERROR_CODES.flatMap((code) =>
  code.startsWith("WA-") ? [`'${code}'`, `'${code.slice(3)}'`] : [`'${code}'`],
).join(",");

export interface Scope {
  /** Where the events live and how its SQL is written. */
  dialect: Dialect;
  /** First day included (UTC, YYYY-MM-DD), or null for the whole history. */
  since: string | null;
  /** First day excluded (UTC, YYYY-MM-DD), or null for "until now". Only bounds the sends. */
  until?: string | null;
  /** Only sends from this application (Marketing Cloud, Digital Engagement); null for all. */
  origin?: string | null;
}

function sinceClause(scope: Scope): string {
  if (!scope.since) return "";
  return `AND ${scope.dialect.eventAt} >= ${scope.dialect.day(check(scope.since, ISO_DATE, "Fecha no válida"))}`;
}

function untilClause(scope: Scope): string {
  if (!scope.until) return "";
  return `AND ${scope.dialect.eventAt} < ${scope.dialect.day(check(scope.until, ISO_DATE, "Fecha no válida"))}`;
}

function originClause(scope: Scope): string {
  if (!scope.origin) return "";
  if (!(Object.values(ORIGIN_APPLICATIONS) as string[]).includes(scope.origin)) {
    throw new InvalidQueryParam("Origen no válido");
  }
  return `AND ${scope.dialect.application} = '${scope.origin}'`;
}

function wabaClause(scope: Scope, wabaIds: string[]): string {
  // No WABA means no rows, never the whole table.
  if (wabaIds.length === 0) return "AND 1 = 0";
  const ids = wabaIds.map((id) => `'${check(id, WABA_ID, "WABA no válida")}'`).join(",");
  return `AND ${scope.dialect.waba} IN (${ids})`;
}

/**
 * Delivery receipts of the sends in scope, one row per wamid. Bounded only from below,
 * so a message sent on the last day still counts the reads that came the day after.
 * The wamids come straight from the send events, without reading the message (the
 * heaviest column, and the costly part in Athena); `msgs` keeps only template sends.
 * The WABA and date filters repeat in the outer query on purpose: they let both scans
 * skip partitions, which is what keeps the cost down.
 */
function statusCte(scope: Scope, wabaIds: string[]): string {
  const d = scope.dialect;
  return `status AS (
    SELECT ${d.wamid} AS wamid,
      MAX(CASE WHEN ${d.status} IN ('DELIVERED','READ') THEN 1 ELSE 0 END) AS delivered,
      MAX(CASE WHEN ${d.status} = 'READ' THEN 1 ELSE 0 END) AS read,
      MAX(CASE WHEN ${d.status} IN ('FAILED','NOT_SENT') THEN 1 ELSE 0 END) AS failed,
      MAX(CASE WHEN ${d.status} IN ('FAILED','NOT_SENT') THEN ${d.error} END) AS error_code,
      MIN(CASE WHEN ${d.status} = 'READ' THEN ${d.eventAt} END) AS read_at
    FROM ${d.table}
    WHERE ${d.eventType} IN ('SEND_STATUS','DR') ${wabaClause(scope, wabaIds)} ${sinceClause(scope)}
      AND ${d.wamid} IN (
        SELECT ${d.wamid} FROM ${d.table}
        WHERE ${d.eventType} = 'SEND_STATUS' AND ${d.status} IN ('SENT','NOT_SENT')
          AND ${d.wamid} IS NOT NULL AND ${d.wamid} <> ''
          ${wabaClause(scope, wabaIds)} ${sinceClause(scope)} ${untilClause(scope)} ${originClause(scope)})
    GROUP BY ${d.wamid})`;
}

/**
 * Template send attempts in scope, with their template, language and WABA. Includes
 * NOT_SENT (rejected by Salesforce before reaching Meta): those are the failures we can
 * fix, and many have no wamid, so their own status and error code are kept here.
 */
function sendsCte(scope: Scope, wabaIds: string[], template?: { name: string; language: string }): string {
  const d = scope.dialect;
  const templateFilter = template
    ? `AND ${d.templateName} = '${check(template.name, TEMPLATE_NAME, "Plantilla no válida")}'
       AND ${d.templateLanguage} = '${check(template.language, LANGUAGE, "Idioma no válido").toLowerCase()}'`
    : `AND ${d.templateName} IS NOT NULL`;
  return `sends AS (
    SELECT ${d.wamid} AS wamid, ${d.waba} AS waba,
      ${d.templateName} AS template, ${d.templateLanguage} AS language, ${d.application} AS origin,
      ${d.status} AS send_status, ${d.error} AS send_error,
      ${d.eventAt} AS sent_at, date_trunc('DAY', ${d.eventAt}) AS day
    FROM ${d.table}
    WHERE ${d.eventType} = 'SEND_STATUS' AND ${d.status} IN ('SENT','NOT_SENT')
      ${wabaClause(scope, wabaIds)} ${sinceClause(scope)} ${untilClause(scope)} ${originClause(scope)} ${templateFilter})`;
}

/**
 * One row per send with a single final state, so every figure comes from the same place:
 * - delivered (or read) wins: a message that reached the phone is never also a failure;
 * - otherwise it failed if Salesforce rejected it (NOT_SENT, with or without wamid) or
 *   Meta reported it failed, and `error_code` is the reason.
 */
const MSGS_CTE = `msgs AS (
    SELECT s.waba AS waba, s.template AS template, s.language AS language, s.origin AS origin,
      s.sent_at AS sent_at, s.day AS day, d.read_at AS read_at,
      CASE WHEN d.delivered = 1 THEN 1 ELSE 0 END AS delivered,
      CASE WHEN d.read = 1 THEN 1 ELSE 0 END AS read,
      CASE WHEN d.delivered = 1 THEN 0
        WHEN s.send_status = 'NOT_SENT' OR d.failed = 1 THEN 1 ELSE 0 END AS failed,
      CASE WHEN d.delivered = 1 THEN NULL
        WHEN s.send_status = 'NOT_SENT' THEN COALESCE(s.send_error, d.error_code)
        WHEN d.failed = 1 THEN d.error_code END AS error_code
    FROM sends s LEFT JOIN status d ON s.wamid = d.wamid)`;

/** The three CTEs every per-message figure starts from. */
function messages(scope: Scope, wabaIds: string[], template?: { name: string; language: string }): string {
  return `WITH ${sendsCte(scope, wabaIds, template)}, ${statusCte(scope, wabaIds)}, ${MSGS_CTE}`;
}

const COUNTS = `COUNT(*) AS sent, SUM(m.delivered) AS delivered, SUM(m.read) AS read, SUM(m.failed) AS failed,
  SUM(CASE WHEN m.error_code IN (${AVOIDABLE_LIST}) THEN 1 ELSE 0 END) AS avoidable`;

/** Median seconds from the send to the first read, over the messages that were read. */
const READ_MEDIAN = `approx_percentile(CASE WHEN m.read_at IS NOT NULL
  THEN GREATEST(0, date_diff('second', m.sent_at, m.read_at)) END, 0.5) AS read_median`;

/** Daily counts for one template (WABA + name + language). */
export function templateDailySql(scope: Scope, wabaId: string, name: string, language: string): string {
  return `${messages(scope, [wabaId], { name, language })}
    SELECT m.day AS day, ${COUNTS}
    FROM msgs m GROUP BY m.day ORDER BY m.day`;
}

/** Counts per template for the selected WABAs (all when empty). */
export function templateRankingSql(scope: Scope, wabaIds: string[]): string {
  return `${messages(scope, wabaIds)}
    SELECT m.waba AS waba, m.template AS template, m.language AS language, ${COUNTS}, ${READ_MEDIAN}
    FROM msgs m GROUP BY m.waba, m.template, m.language ORDER BY sent DESC`;
}

/**
 * Totals per origin plus a '__total' row for everything, with the read-time median
 * (which can't be added up from the per-origin rows). One pass with GROUPING SETS where
 * the source allows it; Data Cloud doesn't with percentiles, hence its UNION ALL.
 * Optionally for one template.
 */
export function overviewSql(scope: Scope, wabaIds: string[], template?: { name: string; language: string }): string {
  if (scope.dialect.groupingSets) {
    return `${messages(scope, wabaIds, template)}
    SELECT CASE WHEN grouping(m.origin) = 1 THEN '__total' ELSE COALESCE(m.origin, '') END AS origin,
      ${COUNTS}, ${READ_MEDIAN}
    FROM msgs m GROUP BY GROUPING SETS ((m.origin), ())`;
  }
  return `${messages(scope, wabaIds, template)}
    SELECT COALESCE(m.origin, '') AS origin, ${COUNTS}, ${READ_MEDIAN}
    FROM msgs m GROUP BY m.origin
    UNION ALL
    SELECT '__total' AS origin, ${COUNTS}, ${READ_MEDIAN}
    FROM msgs m`;
}

/** Sends and deliveries per WABA and origin: what Salesforce delivered, to set against Meta's count. */
export function wabaOriginSql(scope: Scope, wabaIds: string[]): string {
  return `${messages(scope, wabaIds)}
    SELECT m.waba AS waba, COALESCE(m.origin, '') AS origin, COUNT(*) AS sent, SUM(m.delivered) AS delivered
    FROM msgs m GROUP BY m.waba, m.origin`;
}

/** When the copy was last loaded (only for sources that record it). */
export function lastLoadSql(dialect: Dialect): string | null {
  return dialect.loadedAt ? `SELECT MAX(${dialect.loadedAt}) AS loaded_at FROM ${dialect.table}` : null;
}

/** Daily template sends for the selected WABAs (all when empty). */
export function summaryDailySql(scope: Scope, wabaIds: string[]): string {
  return `WITH ${sendsCte(scope, wabaIds)}
    SELECT s.day AS day, COUNT(*) AS sent FROM sends s GROUP BY s.day ORDER BY s.day`;
}

/**
 * Failed template sends by reason; optionally for a single template. One reason per
 * failed message, so the reasons add up to the «Fallos» figure.
 */
export function errorsSql(scope: Scope, wabaIds: string[], template?: { name: string; language: string }): string {
  return `${messages(scope, wabaIds, template)}
    SELECT CASE WHEN m.error_code IS NULL OR m.error_code = '' THEN 'Desconocido' ELSE m.error_code END AS code,
      COUNT(*) AS failed
    FROM msgs m WHERE m.failed = 1
    GROUP BY CASE WHEN m.error_code IS NULL OR m.error_code = '' THEN 'Desconocido' ELSE m.error_code END
    ORDER BY failed DESC`;
}

/**
 * SQL for the WhatsApp events Data Cloud keeps from Meta's webhooks.
 *
 * One row per event: SEND_STATUS (sent by Salesforce, carries the template payload)
 * and DR (Meta's delivery receipts: sent, delivered, read, failed), all sharing the
 * message's WhatsAppWamId__c. Template name and language live inside Message__c.
 *
 * Every value that ends up in SQL is validated against a strict pattern first.
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
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export class InvalidQueryParam extends Error {
  name = "InvalidQueryParam";
}

function check(value: string, pattern: RegExp, message: string): string {
  if (!pattern.test(value)) throw new InvalidQueryParam(message);
  return value;
}

// The name of the template object, not just the first "name" in the payload.
const NAME_EXPR = `regexp_extract(Message__c, '"template":\\{"name":"([^"]+)"', 1)`;
const LANGUAGE_EXPR = `lower(regexp_extract(Message__c, '"language":\\{"code":"([^"]+)"', 1))`;
// WhatsApp codes arrive both with the "WA-" prefix (through e360) and bare ("132000").
const AVOIDABLE_LIST = AVOIDABLE_ERROR_CODES.flatMap((code) =>
  code.startsWith("WA-") ? [`'${code}'`, `'${code.slice(3)}'`] : [`'${code}'`],
).join(",");

/** Values of Application__c: where in Salesforce the send came from. */
export const ORIGIN_APPLICATIONS = {
  mce: "MARKETING_CLOUD_ENGAGEMENT",
  de: "DIGITAL_ENGAGEMENT",
} as const;

export interface Scope {
  dlo: string;
  /** First day included (UTC, YYYY-MM-DD), or null for the whole history. */
  since: string | null;
  /** First day excluded (UTC, YYYY-MM-DD), or null for "until now". Only bounds the sends. */
  until?: string | null;
  /** Only sends from this Application__c; null for every origin. */
  origin?: string | null;
}

function sinceClause(scope: Scope): string {
  return scope.since ? `AND EventDateTime__c >= '${check(scope.since, ISO_DATE, "Fecha no válida")}'` : "";
}

function untilClause(scope: Scope): string {
  return scope.until ? `AND EventDateTime__c < '${check(scope.until, ISO_DATE, "Fecha no válida")}'` : "";
}

function originClause(scope: Scope): string {
  if (!scope.origin) return "";
  if (!(Object.values(ORIGIN_APPLICATIONS) as string[]).includes(scope.origin)) {
    throw new InvalidQueryParam("Origen no válido");
  }
  return `AND Application__c = '${scope.origin}'`;
}

function wabaClause(wabaIds: string[]): string {
  if (wabaIds.length === 0) return "";
  return `AND ExternalAccountId__c IN (${wabaIds.map((id) => `'${check(id, WABA_ID, "WABA no válida")}'`).join(",")})`;
}

/**
 * Delivery receipts of the messages in `sends`, one row per wamid. Restricted to those
 * wamids, and bounded only from below, so a message sent on the last day still counts
 * the reads that came the day after.
 */
function statusCte(scope: Scope, wabaIds: string[]): string {
  return `status AS (
    SELECT WhatsAppWamId__c AS wamid,
      MAX(CASE WHEN SendStatus__c IN ('DELIVERED','READ') THEN 1 ELSE 0 END) AS delivered,
      MAX(CASE WHEN SendStatus__c = 'READ' THEN 1 ELSE 0 END) AS read,
      MAX(CASE WHEN SendStatus__c IN ('FAILED','NOT_SENT') THEN 1 ELSE 0 END) AS failed,
      MAX(CASE WHEN SendStatus__c IN ('FAILED','NOT_SENT') THEN ErrorCode__c END) AS error_code,
      MIN(CASE WHEN SendStatus__c = 'READ' THEN EventDateTime__c END) AS read_at
    FROM ${check(scope.dlo, DLO_NAME, "Objeto de Data Cloud no válido")}
    WHERE EventType__c IN ('SEND_STATUS','DR') ${wabaClause(wabaIds)} ${sinceClause(scope)}
      AND WhatsAppWamId__c IN (SELECT wamid FROM sends WHERE wamid IS NOT NULL AND wamid <> '')
    GROUP BY WhatsAppWamId__c)`;
}

/**
 * Template send attempts in scope, with their template, language and WABA. Includes
 * NOT_SENT (rejected by Salesforce before reaching Meta): those are the failures we can
 * fix, and many have no wamid, so their own status and error code are kept here.
 */
function sendsCte(scope: Scope, wabaIds: string[], template?: { name: string; language: string }): string {
  const templateFilter = template
    ? `AND ${NAME_EXPR} = '${check(template.name, TEMPLATE_NAME, "Plantilla no válida")}'
       AND ${LANGUAGE_EXPR} = '${check(template.language, LANGUAGE, "Idioma no válido").toLowerCase()}'`
    : `AND ${NAME_EXPR} IS NOT NULL`;
  return `sends AS (
    SELECT WhatsAppWamId__c AS wamid, ExternalAccountId__c AS waba,
      ${NAME_EXPR} AS template, ${LANGUAGE_EXPR} AS language, Application__c AS origin,
      SendStatus__c AS send_status, ErrorCode__c AS send_error,
      EventDateTime__c AS sent_at, date_trunc('DAY', EventDateTime__c) AS day
    FROM ${check(scope.dlo, DLO_NAME, "Objeto de Data Cloud no válido")}
    WHERE EventType__c = 'SEND_STATUS' AND SendStatus__c IN ('SENT','NOT_SENT')
      ${wabaClause(wabaIds)} ${sinceClause(scope)} ${untilClause(scope)} ${originClause(scope)} ${templateFilter})`;
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
 * (which can't be added up from the per-origin rows). Data Cloud doesn't support
 * percentiles with GROUPING SETS, hence the UNION ALL. Optionally for one template.
 */
export function overviewSql(scope: Scope, wabaIds: string[], template?: { name: string; language: string }): string {
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

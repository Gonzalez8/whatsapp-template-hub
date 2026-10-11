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

const NAME_EXPR = `regexp_extract(Message__c, '"name":"([^"]+)"', 1)`;
const LANGUAGE_EXPR = `lower(regexp_extract(Message__c, '"language":\\{"code":"([^"]+)"', 1))`;
// WhatsApp codes arrive both with the "WA-" prefix (through e360) and bare ("132000").
const AVOIDABLE_LIST = AVOIDABLE_ERROR_CODES.flatMap((code) =>
  code.startsWith("WA-") ? [`'${code}'`, `'${code.slice(3)}'`] : [`'${code}'`],
).join(",");

export interface Scope {
  dlo: string;
  /** First day included (UTC, YYYY-MM-DD), or null for the whole history. */
  since: string | null;
}

function sinceClause(scope: Scope): string {
  return scope.since ? `AND EventDateTime__c >= '${check(scope.since, ISO_DATE, "Fecha no válida")}'` : "";
}

function wabaClause(wabaIds: string[]): string {
  if (wabaIds.length === 0) return "";
  return `AND ExternalAccountId__c IN (${wabaIds.map((id) => `'${check(id, WABA_ID, "WABA no válida")}'`).join(",")})`;
}

/** Final state of every message in scope: one row per wamid. */
function statusCte(scope: Scope, wabaIds: string[]): string {
  return `status AS (
    SELECT WhatsAppWamId__c AS wamid,
      MAX(CASE WHEN SendStatus__c IN ('DELIVERED','READ') THEN 1 ELSE 0 END) AS delivered,
      MAX(CASE WHEN SendStatus__c = 'READ' THEN 1 ELSE 0 END) AS read,
      MAX(CASE WHEN SendStatus__c IN ('FAILED','NOT_SENT') THEN 1 ELSE 0 END) AS failed,
      MAX(CASE WHEN ErrorCode__c IN (${AVOIDABLE_LIST}) THEN 1 ELSE 0 END) AS avoidable
    FROM ${check(scope.dlo, DLO_NAME, "Objeto de Data Cloud no válido")}
    WHERE EventType__c IN ('SEND_STATUS','DR') ${wabaClause(wabaIds)} ${sinceClause(scope)}
    GROUP BY WhatsAppWamId__c)`;
}

/**
 * Template send attempts in scope, with their template, language and WABA. Includes
 * NOT_SENT (rejected by Salesforce before reaching Meta): those are the failures we can fix.
 */
function sendsCte(scope: Scope, wabaIds: string[], template?: { name: string; language: string }): string {
  const templateFilter = template
    ? `AND ${NAME_EXPR} = '${check(template.name, TEMPLATE_NAME, "Plantilla no válida")}'
       AND ${LANGUAGE_EXPR} = '${check(template.language, LANGUAGE, "Idioma no válido").toLowerCase()}'`
    : `AND ${NAME_EXPR} IS NOT NULL`;
  return `sends AS (
    SELECT WhatsAppWamId__c AS wamid, ExternalAccountId__c AS waba,
      ${NAME_EXPR} AS template, ${LANGUAGE_EXPR} AS language,
      date_trunc('DAY', EventDateTime__c) AS day
    FROM ${check(scope.dlo, DLO_NAME, "Objeto de Data Cloud no válido")}
    WHERE EventType__c = 'SEND_STATUS' AND SendStatus__c IN ('SENT','NOT_SENT')
      ${wabaClause(wabaIds)} ${sinceClause(scope)} ${templateFilter})`;
}

const COUNTS = `COUNT(*) AS sent, SUM(COALESCE(d.delivered,0)) AS delivered, SUM(COALESCE(d.read,0)) AS read,
  SUM(COALESCE(d.failed,0)) AS failed, SUM(COALESCE(d.avoidable,0)) AS avoidable`;

/** Daily counts for one template (WABA + name + language). */
export function templateDailySql(scope: Scope, wabaId: string, name: string, language: string): string {
  return `WITH ${sendsCte(scope, [wabaId], { name, language })}, ${statusCte(scope, [wabaId])}
    SELECT s.day AS day, ${COUNTS}
    FROM sends s LEFT JOIN status d ON s.wamid = d.wamid
    GROUP BY s.day ORDER BY s.day`;
}

/** Counts per template for the selected WABAs (all when empty). */
export function templateRankingSql(scope: Scope, wabaIds: string[]): string {
  return `WITH ${sendsCte(scope, wabaIds)}, ${statusCte(scope, wabaIds)}
    SELECT s.waba AS waba, s.template AS template, s.language AS language, ${COUNTS}
    FROM sends s LEFT JOIN status d ON s.wamid = d.wamid
    GROUP BY s.waba, s.template, s.language ORDER BY sent DESC`;
}

/** Daily template sends for the selected WABAs (all when empty). */
export function summaryDailySql(scope: Scope, wabaIds: string[]): string {
  return `WITH ${sendsCte(scope, wabaIds)}
    SELECT s.day AS day, COUNT(*) AS sent FROM sends s GROUP BY s.day ORDER BY s.day`;
}

/** Failed template sends by error code; optionally for a single template. */
export function errorsSql(scope: Scope, wabaIds: string[], template?: { name: string; language: string }): string {
  return `WITH ${sendsCte(scope, wabaIds, template)}
    SELECT f.ErrorCode__c AS code, COUNT(DISTINCT f.WhatsAppWamId__c) AS failed
    FROM sends s JOIN ${check(scope.dlo, DLO_NAME, "Objeto de Data Cloud no válido")} f ON s.wamid = f.WhatsAppWamId__c
    WHERE f.SendStatus__c IN ('FAILED','NOT_SENT') ${sinceClause(scope).replace("EventDateTime__c", "f.EventDateTime__c")}
    GROUP BY f.ErrorCode__c ORDER BY failed DESC`;
}

"use client";

import { useCallback, useMemo, useState } from "react";
import type { Template, Waba } from "@/types/template";
import {
  ANALYTICS_ORIGINS,
  rates,
  type AnalyticsOrigin,
  type AnalyticsRange,
  type MetaVolume,
  type OriginRow,
  type SummaryAnalytics,
  type TemplateRow,
} from "@/lib/analytics/types";
import { addDays, daysAgoUtc, fillDays, formatDay, formatWeekday, todayUtc, toWeeks } from "@/lib/analytics/series";
import { useAnalytics } from "@/hooks/useAnalytics";
import {
  BarChart,
  Card,
  ErrorList,
  InfoTip,
  Kpi,
  LoadError,
  Loading,
  ORIGIN_LABELS,
  RangePicker,
  Segmented,
  SourceNote,
  applicationLabel,
  formatDuration,
  formatNumber,
  formatPercent,
  sendPoints,
} from "./shared";

const RANGES: AnalyticsRange[] = ["7d", "30d", "90d", "all"];
const RANGE_DAYS: Partial<Record<AnalyticsRange, number>> = { "7d": 7, "30d": 30, "90d": 90 };
const PAGE = 25;
const UNUSED_PAGE = 8;
/** Window for "templates without sends". */
const UNUSED_RANGE: AnalyticsRange = "90d";
/** Meta keeps 90 days of pricing data. */
const META_RANGE: AnalyticsRange = "90d";

const SALESFORCE_ORIGIN_LABELS: Record<AnalyticsOrigin, string> = {
  all: "Todo Salesforce",
  mce: "Marketing Cloud",
  de: "Digital Engagement",
};

/** Meta's pricing categories, explained for the legend. */
const CATEGORIES: Record<string, { label: string; help: string }> = {
  MARKETING: { label: "Marketing", help: "Plantillas promocionales. Siempre de pago, la tarifa más alta." },
  MARKETING_LITE: {
    label: "Marketing Lite",
    help: "Marketing enviado por la Marketing Messages API de Meta. De pago, con la tarifa de marketing.",
  },
  UTILITY: {
    label: "Utilidad",
    help: "Confirmaciones, recordatorios y avisos. De pago, salvo dentro de una conversación abierta.",
  },
  AUTHENTICATION: { label: "Autenticación", help: "Códigos de verificación (OTP). Siempre de pago." },
  SERVICE: { label: "Servicio", help: "Respuestas libres a un cliente que ha escrito; no son plantillas. Gratis." },
};

const ORIGIN_OF_APPLICATION: Record<string, AnalyticsOrigin> = {
  MARKETING_CLOUD_ENGAGEMENT: "mce",
  DIGITAL_ENGAGEMENT: "de",
};

const templateKey = (waba: string, name: string, language: string) => `${waba}|${name}|${language.toLowerCase()}`;

interface AnalyticsViewProps {
  wabas: Waba[];
  selectedWabas: Set<string>;
  range: AnalyticsRange;
  onRangeChange: (range: AnalyticsRange) => void;
  origin: AnalyticsOrigin;
  onOriginChange: (origin: AnalyticsOrigin) => void;
  /** Day (or Monday of the week, in "all") picked on the chart. */
  day: string | null;
  onDayChange: (day: string | null) => void;
  onOpenTemplate: (template: Template) => void;
}

const summaryUrl = (params: Record<string, string>) => `/api/analytics/summary?${new URLSearchParams(params)}`;

export function AnalyticsView({
  wabas,
  selectedWabas,
  range,
  onRangeChange,
  origin,
  onOriginChange,
  day,
  onDayChange,
  onOpenTemplate,
}: AnalyticsViewProps) {
  const ids = [...selectedWabas].sort();
  const waba = ids.join(",");
  const weekly = !RANGE_DAYS[range];
  // A day from an old link that is not on the chart any more (another range) is ignored.
  const rangeDays = RANGE_DAYS[range];
  const onChart =
    !!day &&
    day <= todayUtc() &&
    (rangeDays ? day >= daysAgoUtc(rangeDays) : new Date(`${day}T00:00:00Z`).getUTCDay() === 1);
  const pickedDay = onChart ? day : null;
  const period = pickedDay ? { from: pickedDay, to: addDays(pickedDay, weekly ? 7 : 1) } : null;
  const salesforce = { waba, range, ...(origin !== "all" && { origin }) };

  // Layer 2 (Salesforce): the chart always covers the range; the rest follows a picked day.
  const main = useAnalytics<SummaryAnalytics>(summaryUrl(salesforce));
  const picked = useAnalytics<SummaryAnalytics>(period ? summaryUrl({ ...salesforce, ...period }) : null);
  // Layer 1 (Meta) compares against every Salesforce origin. Meta keeps 90 days, so
  // "Todo" is set against Salesforce's last 90 days too.
  const everything = useAnalytics<SummaryAnalytics>(
    summaryUrl(period ? { waba, range, ...period } : { waba, range: range === "all" ? META_RANGE : range }),
  );
  // Usage over 90 days, every origin: which templates aren't sent any more.
  const usage = useAnalytics<SummaryAnalytics>(summaryUrl({ waba, range: UNUSED_RANGE }));

  const byId = useMemo(() => new Map(wabas.map((w) => [w.waba_id, w])), [wabas]);
  const selected = ids.map((id) => byId.get(id)).filter((w): w is Waba => !!w);
  const title =
    selected.length === 0
      ? "Todas las WABAs"
      : selected.length === 1
        ? selected[0].waba_name
        : `${selected.length} WABAs`;
  const subtitle =
    selected.length === 1
      ? selected[0].phone_numbers[0]?.display_phone_number
      : selected.length > 1
        ? selected.map((w) => w.waba_name).join(" · ")
        : "Marca WABAs en la barra lateral para acotar";

  // The ranking comes from Data Cloud; link each row to the template Meta has (if it still exists).
  const findTemplate = useCallback(
    (row: TemplateRow) =>
      byId
        .get(row.waba)
        ?.templates.find((t) => t.name === row.template && t.language.toLowerCase() === row.language.toLowerCase()),
    [byId],
  );

  const figures = period ? picked : main;
  const pickedLabel = pickedDay ? (weekly ? `la semana del ${formatDay(pickedDay)}` : formatWeekday(pickedDay)) : null;

  return (
    <div className="bg-canvas h-full overflow-y-auto">
      <div className="mx-auto max-w-[1280px] space-y-4 px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold">{title}</h1>
            {subtitle && <p className="text-muted mt-0.5 truncate text-xs">{subtitle}</p>}
          </div>
          <RangePicker value={range} options={RANGES} onChange={onRangeChange} />
        </div>

        {pickedLabel && (
          <div className="bg-accent/10 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-3 py-2 text-sm">
            <span>
              Mostrando <strong>{pickedLabel}</strong>
            </span>
            <button
              type="button"
              onClick={() => onDayChange(null)}
              className="text-accent-ink text-xs font-medium hover:underline"
            >
              Ver todo el periodo ✕
            </button>
          </div>
        )}

        <Layer
          source="Meta"
          title="Todo WhatsApp, según Meta"
          description="Cualquier herramienta: todo lo que Meta entrega y factura"
          aside={!period && range === "all" ? "últimos 90 días" : undefined}
        >
          {everything.status === "loading" && <div className="shimmer h-40 rounded-xl" aria-busy="true" />}
          {everything.status === "error" && <LoadError message={everything.message} />}
          {everything.status === "ready" && (
            <MetaLayer
              data={everything.data}
              wabaIds={ids.length ? ids : null}
              byId={byId}
              showTable={selected.length !== 1}
            />
          )}
        </Layer>

        <Layer
          source="Data Cloud"
          title="Detalle de Salesforce"
          description="Data Cloud: plantilla a plantilla, con entrega, lectura y fallos"
          controls={
            <Segmented
              label="Origen en Salesforce"
              value={origin}
              options={ANALYTICS_ORIGINS}
              labels={SALESFORCE_ORIGIN_LABELS}
              onChange={onOriginChange}
            />
          }
        >
          {main.status === "loading" && <Loading />}
          {main.status === "error" && <LoadError message={main.message} />}
          {main.status === "ready" && (
            <>
              {figures.status === "ready" ? (
                <Kpis data={figures.data} origin={origin} />
              ) : figures.status === "error" ? (
                <LoadError message={figures.message} />
              ) : (
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-5" aria-busy="true">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="shimmer h-24 rounded-xl" />
                  ))}
                </div>
              )}

              <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
                <Card
                  title={`Plantillas enviadas por ${weekly ? "semana" : "día"}`}
                  aside={`Pulsa ${weekly ? "una semana" : "un día"} para verlo en detalle`}
                >
                  <SendsChart data={main.data} range={range} day={pickedDay} onDayChange={onDayChange} />
                </Card>
                {figures.status === "ready" && (
                  <Origins rows={figures.data.origins} origin={origin} onOriginChange={onOriginChange} />
                )}
              </div>

              {figures.status === "ready" && (
                <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
                  <Ranking
                    data={figures.data}
                    showWaba={selected.length !== 1}
                    byId={byId}
                    findTemplate={findTemplate}
                    onOpenTemplate={onOpenTemplate}
                  />
                  <div className="min-w-0 space-y-3">
                    <Card title="Fallos por motivo">
                      <ErrorList errors={figures.data.errors} />
                    </Card>
                    <UnusedTemplates
                      state={usage}
                      wabas={selected.length ? selected : wabas}
                      showWaba={selected.length !== 1}
                      byId={byId}
                      findTemplate={findTemplate}
                      onOpenTemplate={onOpenTemplate}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </Layer>

        {figures.status === "ready" && <SourceNote generatedAt={figures.data.generatedAt} />}
      </div>
    </div>
  );
}

function Layer({
  source,
  title,
  description,
  aside,
  controls,
  children,
}: {
  source: string;
  title: string;
  description: string;
  aside?: string;
  controls?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title} className="border-line bg-surface space-y-4 rounded-2xl border p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="bg-canvas text-muted rounded-full px-2 py-0.5 text-[11px] font-medium">Fuente: {source}</span>
        <h2 className="text-base font-semibold">{title}</h2>
        <span className="text-faint text-xs">{description}</span>
        {aside && <span className="text-muted text-xs">· {aside}</span>}
        {controls && <div className="ml-auto">{controls}</div>}
      </div>
      {children}
    </section>
  );
}

const MC = "MARKETING_CLOUD_ENGAGEMENT";
const DE = "DIGITAL_ENGAGEMENT";
const HATCH = "repeating-linear-gradient(135deg, var(--color-line-strong) 0 5px, var(--color-line) 5px 10px)";

/** Templates Meta delivered for a selection: every category but service conversations. */
const metaTemplates = (meta: MetaVolume) =>
  Object.entries(meta.byCategory).reduce((n, [category, v]) => (category === "SERVICE" ? n : n + v), 0);

/** Three-part bar: Marketing Cloud, Digital Engagement and outside Salesforce. */
function SplitBar({ mc, de, outside, scale }: { mc: number; de: number; outside: number; scale: number }) {
  const pct = (n: number) => `${scale ? (n / scale) * 100 : 0}%`;
  return (
    <div className="bg-canvas flex h-2.5 overflow-hidden rounded-full" aria-hidden="true">
      <div className="bg-accent" style={{ width: pct(mc) }} />
      <div className="bg-accent/45" style={{ width: pct(de) }} />
      <div style={{ width: pct(outside), background: HATCH }} />
    </div>
  );
}

function Swatch({ kind }: { kind: "mc" | "de" | "outside" }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-[3px] ${kind === "mc" ? "bg-accent" : kind === "de" ? "bg-accent/45" : ""}`}
      style={kind === "outside" ? { background: HATCH } : undefined}
    />
  );
}

function MetaLayer({
  data,
  wabaIds,
  byId,
  showTable,
}: {
  data: SummaryAnalytics;
  wabaIds: string[] | null;
  byId: Map<string, Waba>;
  showTable: boolean;
}) {
  const { meta } = data;
  const delivered = (application: string) => data.origins.find((o) => o.origin === application)?.delivered ?? 0;
  const mc = delivered(MC);
  const de = delivered(DE);
  const sf = data.totals.delivered;
  const templates = meta ? metaTemplates(meta) : null;
  const outside = templates === null ? null : Math.max(0, templates - sf);
  const categories = meta ? Object.entries(meta.byCategory).sort((a, b) => b[1] - a[1]) : [];

  return (
    <>
      <div className="grid gap-3 lg:grid-cols-[2fr_1fr_1fr]">
        <div className="border-line rounded-xl border px-4 py-3.5">
          <div className="text-muted flex items-center gap-1 text-xs">
            Plantillas entregadas
            <InfoTip
              label="Cómo se calcula"
              text="Meta cuenta las plantillas entregadas desde cualquier herramienta. «Fuera de Salesforce» es esa cifra menos lo que entregó Salesforce. Es una estimación: en un solo día puede variar en unos pocos mensajes porque Meta cuenta los días con la hora de la WABA y Data Cloud en UTC."
            />
          </div>
          <div className="mt-1.5 text-2xl font-semibold tracking-tight">
            {templates === null ? "—" : formatNumber(templates)}
          </div>
          <div className="mt-3">
            <SplitBar mc={mc} de={de} outside={outside ?? 0} scale={Math.max(templates ?? 0, sf)} />
          </div>
          <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <span className="flex items-center gap-1.5">
              <Swatch kind="mc" />
              Marketing Cloud <strong>{formatNumber(mc)}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <Swatch kind="de" />
              Digital Engagement <strong>{formatNumber(de)}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <Swatch kind="outside" />
              Fuera de Salesforce <strong>{outside === null ? "—" : `≈ ${formatNumber(outside)}`}</strong>
            </span>
          </div>
        </div>
        <div className="border-line rounded-xl border px-4 py-3.5">
          <div className="text-muted flex items-center gap-1 text-xs">
            Conversaciones de servicio
            <InfoTip label="Qué es Servicio" text={CATEGORIES.SERVICE.help} />
          </div>
          <div className="mt-1.5 text-2xl font-semibold tracking-tight">
            {meta ? formatNumber(meta.byCategory.SERVICE ?? 0) : "—"}
          </div>
          <div className="text-muted mt-1 text-xs">Respuestas de agentes y bots. No son plantillas. Gratis.</div>
        </div>
        <div className="border-line rounded-xl border px-4 py-3.5">
          <div className="text-muted text-xs">Por categoría</div>
          {meta ? (
            <div className="mt-2 space-y-1.5 text-xs">
              {categories.map(([category, n]) => (
                <div key={category} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1">
                    {CATEGORIES[category]?.label ?? category}
                    {CATEGORIES[category] && (
                      <InfoTip label={`Qué es ${CATEGORIES[category].label}`} text={CATEGORIES[category].help} />
                    )}
                  </span>
                  <span className="font-mono">{formatNumber(n)}</span>
                </div>
              ))}
              <div className="border-line flex items-center justify-between gap-2 border-t pt-1.5">
                <span className="flex items-center gap-1">
                  De pago · Gratis
                  <InfoTip
                    label="Qué se paga y qué es gratis"
                    text="Meta cobra por mensaje entregado. Es gratis lo que se envía en la ventana de 24 h que abre el cliente al escribir (72 h si llega desde un anuncio) y cualquier respuesta de servicio."
                  />
                </span>
                <span>
                  <strong>{formatNumber(meta.paid)}</strong> · <strong>{formatNumber(meta.free)}</strong>
                </span>
              </div>
            </div>
          ) : (
            <p className="text-muted mt-2 text-sm">Meta no responde ahora mismo.</p>
          )}
        </div>
      </div>
      {meta && showTable && <WhoSends data={data} meta={meta} wabaIds={wabaIds} byId={byId} />}
    </>
  );
}

const WHO_PAGE = 8;

function WhoSends({
  data,
  meta,
  wabaIds,
  byId,
}: {
  data: SummaryAnalytics;
  meta: MetaVolume;
  wabaIds: string[] | null;
  byId: Map<string, Waba>;
}) {
  const [visible, setVisible] = useState(WHO_PAGE);
  const rows = useMemo(() => {
    const ids = wabaIds ?? [...new Set([...Object.keys(meta.byWaba), ...data.wabaOrigins.map((r) => r.waba)])];
    return ids
      .map((id) => {
        const of = (application: string) =>
          data.wabaOrigins.find((r) => r.waba === id && r.origin === application)?.delivered ?? 0;
        const sf = data.wabaOrigins.filter((r) => r.waba === id).reduce((n, r) => n + r.delivered, 0);
        const inMeta = meta.byWaba[id]?.templates ?? 0;
        return { id, mc: of(MC), de: of(DE), sf, inMeta, outside: Math.max(0, inMeta - sf) };
      })
      .filter((r) => r.inMeta > 0 || r.sf > 0)
      .sort((a, b) => b.outside - a.outside || b.inMeta - a.inMeta);
  }, [data.wabaOrigins, meta.byWaba, wabaIds]);

  const scale = Math.max(1, ...rows.map((r) => Math.max(r.inMeta, r.sf)));
  const onlyOutside = rows.filter((r) => r.sf === 0).length;
  const mixed = rows.filter((r) => r.sf > 0 && r.outside > 0).length;
  const templates = metaTemplates(meta);
  const coverage = templates ? Math.min(1, data.totals.delivered / templates) : null;

  return (
    <div className="border-line rounded-xl border px-4 py-3.5">
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        <h3 className="text-[13px] font-semibold">Quién envía las plantillas</h3>
        <span className="text-muted text-xs">plantillas entregadas por WABA</span>
        <span className="ml-auto flex flex-wrap gap-x-3 gap-y-1 text-xs">
          <span className="flex items-center gap-1.5">
            <Swatch kind="mc" />
            Marketing Cloud
          </span>
          <span className="flex items-center gap-1.5">
            <Swatch kind="de" />
            Digital Engagement
          </span>
          <span className="flex items-center gap-1.5">
            <Swatch kind="outside" />
            Fuera de Salesforce
          </span>
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm">Sin plantillas entregadas en el periodo.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-muted">
              <tr>
                <th className="py-1.5 font-medium">WABA</th>
                <th className="w-[40%] px-2 py-1.5 font-medium">Reparto</th>
                <th className="px-2 py-1.5 text-right font-medium">En Meta</th>
                <th className="px-2 py-1.5 text-right font-medium">Salesforce</th>
                <th className="py-1.5 text-right font-medium">Fuera</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, visible).map((r) => (
                <tr key={r.id} className="border-line/70 border-t">
                  <td className="max-w-[220px] truncate py-2">{byId.get(r.id)?.waba_name ?? r.id}</td>
                  <td className="px-2 py-2">
                    <SplitBar mc={r.mc} de={r.de} outside={r.outside} scale={scale} />
                  </td>
                  <td className="px-2 py-2 text-right font-mono whitespace-nowrap">{formatNumber(r.inMeta)}</td>
                  <td className="px-2 py-2 text-right font-mono whitespace-nowrap">{formatNumber(r.sf)}</td>
                  <td className="py-2 text-right whitespace-nowrap">
                    {r.sf === 0 ? (
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
                        Todo fuera
                      </span>
                    ) : r.outside === 0 ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                        Todo Salesforce
                      </span>
                    ) : (
                      <span className="font-mono">≈ {formatNumber(r.outside)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > visible && (
            <button
              type="button"
              onClick={() => setVisible(rows.length)}
              className="text-accent-ink mt-2 text-xs font-medium hover:underline"
            >
              Ver las {rows.length} WABAs
            </button>
          )}
        </div>
      )}
      <p className="text-muted mt-2 text-xs">
        {onlyOutside} {onlyOutside === 1 ? "WABA envía" : "WABAs envían"} solo fuera de Salesforce · {mixed}{" "}
        {mixed === 1 ? "mixta" : "mixtas"}
        {coverage !== null && (
          <>
            {" "}
            · Salesforce entrega el <strong>{formatPercent(coverage)}</strong> de las plantillas
          </>
        )}
      </p>
    </div>
  );
}

function Kpis({ data, origin }: { data: SummaryAnalytics; origin: AnalyticsOrigin }) {
  const { totals } = data;
  const r = rates(totals);
  const sent = (application: string) => data.origins.find((o) => o.origin === application)?.sent ?? 0;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Kpi
        label="Enviadas"
        value={formatNumber(totals.sent)}
        sub={
          origin === "all"
            ? `MC ${formatNumber(sent(MC))} · DE ${formatNumber(sent(DE))}`
            : `desde ${ORIGIN_LABELS[origin]}`
        }
      />
      <Kpi label="Entregadas" value={formatPercent(r.delivery)} sub={`${formatNumber(totals.delivered)} mensajes`} />
      <Kpi label="Leídas" value={formatPercent(r.read)} sub={`${formatNumber(totals.read)} de las entregadas`} />
      <Kpi label="Tiempo hasta lectura" value={formatDuration(totals.readMedian)} sub="mediana desde el envío" />
      <Kpi
        label="Fallos"
        value={formatNumber(totals.failed)}
        sub={`${totals.avoidable} evitables · ${totals.failed - totals.avoidable} ruido`}
        tone={totals.avoidable ? "bad" : undefined}
      />
    </div>
  );
}

function SendsChart({
  data,
  range,
  day,
  onDayChange,
}: {
  data: SummaryAnalytics;
  range: AnalyticsRange;
  day: string | null;
  onDayChange: (day: string | null) => void;
}) {
  const rangeDays = RANGE_DAYS[range];
  const days = data.daily.map((d) => ({ day: d.day, value: d.sent }));
  const series = rangeDays ? fillDays(days, daysAgoUtc(rangeDays), todayUtc()) : toWeeks(days);
  return (
    <BarChart
      label={`Envíos de plantillas: ${formatNumber(data.totals.sent)} en total`}
      points={sendPoints(series, !rangeDays)}
      selected={day}
      onSelect={onDayChange}
    />
  );
}

function Ranking({
  data,
  showWaba,
  byId,
  findTemplate,
  onOpenTemplate,
}: {
  data: SummaryAnalytics;
  showWaba: boolean;
  byId: Map<string, Waba>;
  findTemplate: (row: TemplateRow) => Template | undefined;
  onOpenTemplate: (template: Template) => void;
}) {
  const [visible, setVisible] = useState(PAGE);
  return (
    <Card title="Plantillas" aside="ordenadas por envíos">
      {data.templates.length === 0 ? (
        <p className="text-sm">Sin envíos de plantillas en el periodo.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-muted">
              <tr>
                <th className="py-1.5 font-medium">Plantilla</th>
                {showWaba && <th className="px-2 py-1.5 font-medium">WABA</th>}
                <th className="px-2 py-1.5 text-right font-medium">Enviadas</th>
                <th className="px-2 py-1.5 text-right font-medium">Entrega</th>
                <th className="px-2 py-1.5 text-right font-medium">Lectura</th>
                <th className="px-2 py-1.5 text-right font-medium" title="Mediana del tiempo hasta la lectura">
                  Lee en
                </th>
                <th className="py-1.5 text-right font-medium">Fallos</th>
              </tr>
            </thead>
            <tbody>
              {data.templates.slice(0, visible).map((row) => {
                const template = findTemplate(row);
                const rr = rates(row);
                return (
                  <tr key={`${row.waba}-${row.template}-${row.language}`} className="border-line/70 border-t">
                    <td className="max-w-[220px] py-2 font-mono">
                      {template ? (
                        <button
                          type="button"
                          onClick={() => onOpenTemplate(template)}
                          className="hover:text-accent-ink block max-w-full truncate text-left hover:underline"
                          title={`${row.template} (${row.language})`}
                        >
                          {row.template}
                        </button>
                      ) : (
                        <span className="text-muted block truncate" title="Ya no existe en Meta">
                          {row.template}
                        </span>
                      )}
                    </td>
                    {showWaba && (
                      <td
                        className="text-muted max-w-[130px] truncate px-2 py-2"
                        title={byId.get(row.waba)?.waba_name ?? row.waba}
                      >
                        {byId.get(row.waba)?.waba_name ?? row.waba}
                      </td>
                    )}
                    <td className="px-2 py-2 text-right font-mono whitespace-nowrap">{formatNumber(row.sent)}</td>
                    <td className="px-2 py-2 text-right font-mono whitespace-nowrap">{formatPercent(rr.delivery)}</td>
                    <td className="px-2 py-2 text-right font-mono whitespace-nowrap">{formatPercent(rr.read)}</td>
                    <td className="px-2 py-2 text-right font-mono whitespace-nowrap">
                      {formatDuration(row.readMedian)}
                    </td>
                    <td
                      className={`py-2 text-right font-mono whitespace-nowrap ${row.avoidable ? "font-semibold text-red-700" : ""}`}
                      title={row.avoidable ? `${row.avoidable} evitables` : undefined}
                    >
                      {formatNumber(row.failed)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {data.templates.length > visible && (
            <button
              type="button"
              onClick={() => setVisible((v) => v + PAGE)}
              className="text-accent-ink mt-2 text-xs font-medium hover:underline"
            >
              Ver más ({data.templates.length - visible} restantes)
            </button>
          )}
        </div>
      )}
    </Card>
  );
}

function Origins({
  rows,
  origin,
  onOriginChange,
}: {
  rows: OriginRow[];
  origin: AnalyticsOrigin;
  onOriginChange: (origin: AnalyticsOrigin) => void;
}) {
  const total = rows.reduce((n, row) => n + row.sent, 0);
  return (
    <Card title="Por origen" aside={origin === "all" ? "Marketing Cloud y Digital Engagement" : "filtrado"}>
      {rows.length === 0 ? (
        <p className="text-sm">Sin envíos en el periodo.</p>
      ) : (
        <table className="w-full text-left text-xs">
          <thead className="text-muted">
            <tr>
              <th className="py-1.5 font-medium">Origen</th>
              <th className="px-2 py-1.5 text-right font-medium">Enviadas</th>
              <th className="px-2 py-1.5 text-right font-medium">Entrega</th>
              <th className="px-2 py-1.5 text-right font-medium">Lectura</th>
              <th className="py-1.5 text-right font-medium">Lee en</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const rr = rates(row);
              const filter = ORIGIN_OF_APPLICATION[row.origin];
              return (
                <tr key={row.origin} className="border-line/70 border-t">
                  <td className="py-2">
                    {filter && origin === "all" ? (
                      <button
                        type="button"
                        onClick={() => onOriginChange(filter)}
                        className="hover:text-accent-ink text-left hover:underline"
                        title="Filtrar por este origen"
                      >
                        {applicationLabel(row.origin)}
                      </button>
                    ) : (
                      applicationLabel(row.origin)
                    )}
                    <div className="bg-canvas mt-1 h-1.5 w-28 rounded-full">
                      <div
                        className="bg-accent h-1.5 rounded-full"
                        style={{ width: `${total ? (row.sent / total) * 100 : 0}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right font-mono whitespace-nowrap">{formatNumber(row.sent)}</td>
                  <td className="px-2 py-2 text-right font-mono whitespace-nowrap">{formatPercent(rr.delivery)}</td>
                  <td className="px-2 py-2 text-right font-mono whitespace-nowrap">{formatPercent(rr.read)}</td>
                  <td className="py-2 text-right font-mono whitespace-nowrap">{formatDuration(row.readMedian)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <p className="text-muted mt-2 text-[11px] leading-snug">
        Las dos son Salesforce y las registra Data Cloud. Lo que Data Cloud no registra solo aparece en el bloque de
        Meta.
      </p>
    </Card>
  );
}

function UnusedTemplates({
  state,
  wabas,
  showWaba,
  byId,
  findTemplate,
  onOpenTemplate,
}: {
  state: ReturnType<typeof useAnalytics<SummaryAnalytics>>;
  wabas: Waba[];
  showWaba: boolean;
  byId: Map<string, Waba>;
  findTemplate: (row: TemplateRow) => Template | undefined;
  onOpenTemplate: (template: Template) => void;
}) {
  const [visible, setVisible] = useState(UNUSED_PAGE);
  const ready = state.status === "ready" ? state.data : null;

  const { unused, approved, gone } = useMemo(() => {
    if (!ready) return { unused: [], approved: 0, gone: [] };
    const sent = new Set(ready.templates.map((row) => templateKey(row.waba, row.template, row.language)));
    const candidates = wabas.flatMap((waba) =>
      waba.templates.filter((t) => t.status === "APPROVED").map((template) => ({ waba, template })),
    );
    return {
      unused: candidates.filter(
        ({ waba, template }) => !sent.has(templateKey(waba.waba_id, template.name, template.language)),
      ),
      approved: candidates.length,
      gone: ready.templates.filter((row) => !findTemplate(row)),
    };
  }, [ready, wabas, findTemplate]);

  return (
    <Card title="Plantillas sin envíos" aside="últimos 90 días">
      {state.status === "loading" && <div className="shimmer h-24 rounded-lg" aria-busy="true" />}
      {state.status === "error" && <LoadError message={state.message} />}
      {ready && (
        <>
          <p className="text-xs">
            <strong>{formatNumber(unused.length)}</strong> de {formatNumber(approved)} plantillas aprobadas no se han
            enviado desde Salesforce.
          </p>
          {unused.length > 0 && (
            <ul className="divide-line/70 mt-2 divide-y">
              {unused.slice(0, visible).map(({ waba, template }) => (
                <li key={template.id} className="flex items-center gap-2 py-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => onOpenTemplate(template)}
                    className="hover:text-accent-ink min-w-0 truncate text-left font-mono hover:underline"
                  >
                    {template.name}
                  </button>
                  <span className="bg-canvas text-ink/80 shrink-0 rounded px-1.5 py-0.5 font-mono text-[11px]">
                    {template.language}
                  </span>
                  {showWaba && <span className="text-muted ml-auto shrink-0 truncate">{waba.waba_name}</span>}
                </li>
              ))}
            </ul>
          )}
          {unused.length > visible && (
            <button
              type="button"
              onClick={() => setVisible((v) => v + UNUSED_PAGE * 3)}
              className="text-accent-ink mt-1 text-xs font-medium hover:underline"
            >
              Ver más ({unused.length - visible} restantes)
            </button>
          )}

          {gone.length > 0 && (
            <>
              <h3 className="mt-4 text-xs font-semibold">Enviadas pero ya no existen en Meta ({gone.length})</h3>
              <ul className="divide-line/70 mt-1 divide-y">
                {gone.map((row) => (
                  <li key={templateKey(row.waba, row.template, row.language)} className="flex gap-2 py-1.5 text-xs">
                    <span className="text-muted min-w-0 truncate font-mono" title={row.template}>
                      {row.template}
                    </span>
                    {showWaba && (
                      <span className="text-muted shrink-0">{byId.get(row.waba)?.waba_name ?? row.waba}</span>
                    )}
                    <span className="ml-auto shrink-0 font-mono">{formatNumber(row.sent)} envíos</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          <p className="text-muted mt-2 text-[11px] leading-snug">
            Solo cuenta los envíos desde Salesforce: una plantilla que se envía desde otra herramienta aparece aquí
            aunque se use.
          </p>
        </>
      )}
    </Card>
  );
}

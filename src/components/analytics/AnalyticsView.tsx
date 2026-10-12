"use client";

import { useCallback, useMemo, useState } from "react";
import type { Template, Waba } from "@/types/template";
import {
  ANALYTICS_ORIGINS,
  rates,
  type AnalyticsOrigin,
  type AnalyticsRange,
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
  const base = { waba, range, ...(origin !== "all" && { origin }) };
  const weekly = !RANGE_DAYS[range];

  // The whole range feeds the chart; a picked day or week feeds everything else.
  const main = useAnalytics<SummaryAnalytics>(summaryUrl(base));
  const picked = useAnalytics<SummaryAnalytics>(
    day ? summaryUrl({ ...base, from: day, to: addDays(day, weekly ? 7 : 1) }) : null,
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

  const figures = day ? picked : main;
  const pickedLabel = day ? (weekly ? `la semana del ${formatDay(day)}` : formatWeekday(day)) : null;

  return (
    <div className="bg-canvas h-full overflow-y-auto">
      <div className="mx-auto max-w-[1280px] space-y-4 px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold">{title}</h1>
            {subtitle && <p className="text-muted mt-0.5 truncate text-xs">{subtitle}</p>}
          </div>
          <Segmented
            label="Origen"
            value={origin}
            options={ANALYTICS_ORIGINS}
            labels={ORIGIN_LABELS}
            onChange={onOriginChange}
          />
          <RangePicker value={range} options={RANGES} onChange={onRangeChange} />
        </div>

        {main.status === "loading" && <Loading />}
        {main.status === "error" && <LoadError message={main.message} />}
        {main.status === "ready" && (
          <>
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

            {figures.status === "ready" ? (
              <Kpis data={figures.data} origin={origin} />
            ) : figures.status === "error" ? (
              <LoadError message={figures.message} />
            ) : (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6" aria-busy="true">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="shimmer h-24 rounded-xl" />
                ))}
              </div>
            )}

            <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
              <Card
                title={`Plantillas enviadas por ${weekly ? "semana" : "día"}`}
                aside={`Pulsa ${weekly ? "una semana" : "un día"} para verlo en detalle`}
              >
                <SendsChart data={main.data} range={range} day={day} onDayChange={onDayChange} />
              </Card>
              {figures.status === "ready" && (
                <MetaCard
                  data={figures.data}
                  note={day ? undefined : range === "all" ? "últimos 90 días" : undefined}
                />
              )}
            </div>

            {figures.status === "ready" && (
              <>
                <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
                  <Ranking
                    data={figures.data}
                    showWaba={selected.length !== 1}
                    byId={byId}
                    findTemplate={findTemplate}
                    onOpenTemplate={onOpenTemplate}
                  />
                  <Card title="Fallos por motivo">
                    <ErrorList errors={figures.data.errors} />
                  </Card>
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  <Origins rows={figures.data.origins} origin={origin} onOriginChange={onOriginChange} />
                  <UnusedTemplates
                    state={usage}
                    wabas={selected.length ? selected : wabas}
                    showWaba={selected.length !== 1}
                    byId={byId}
                    findTemplate={findTemplate}
                    onOpenTemplate={onOpenTemplate}
                  />
                </div>
                <SourceNote generatedAt={figures.data.generatedAt} />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Kpis({ data, origin }: { data: SummaryAnalytics; origin: AnalyticsOrigin }) {
  const { totals, meta } = data;
  const r = rates(totals);
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      <Kpi
        label="Plantillas enviadas"
        value={formatNumber(totals.sent)}
        sub={origin === "all" ? "desde Salesforce" : `desde ${ORIGIN_LABELS[origin]}`}
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
      <Kpi label="Total en Meta" value={meta ? formatNumber(meta.total) : "—"} sub="todos los orígenes" />
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

function MetaCard({ data, note }: { data: SummaryAnalytics; note?: string }) {
  const { meta } = data;
  const categories = meta ? Object.entries(meta.byCategory).sort((a, b) => b[1] - a[1]) : [];
  const maxCategory = Math.max(1, ...categories.map(([, n]) => n));
  return (
    <Card title="Volumen en Meta por categoría" aside={note}>
      {meta ? (
        <>
          {categories.length === 0 && <p className="text-muted text-sm">Sin mensajes en el periodo.</p>}
          {categories.map(([category, n]) => (
            <div key={category} className="mb-3">
              <div className="flex justify-between text-xs">
                <span className="flex items-center gap-1 font-medium">
                  {CATEGORIES[category]?.label ?? category}
                  {CATEGORIES[category] && (
                    <InfoTip label={`Qué es ${CATEGORIES[category].label}`} text={CATEGORIES[category].help} />
                  )}
                </span>
                <span className="font-mono">{formatNumber(n)}</span>
              </div>
              <div className="bg-canvas mt-1 h-2 rounded-full">
                <div className="bg-accent h-2 rounded-full" style={{ width: `${(n / maxCategory) * 100}%` }} />
              </div>
            </div>
          ))}
          <p className="mt-1 flex items-center gap-1 text-xs">
            <span>
              De pago <strong>{formatNumber(meta.paid)}</strong> · Gratis <strong>{formatNumber(meta.free)}</strong>
            </span>
            <InfoTip
              label="Qué se paga y qué es gratis"
              text="Meta cobra por mensaje entregado. Es gratis lo que se envía en la ventana de 24 h que abre el cliente al escribir (72 h si llega desde un anuncio) y cualquier respuesta de servicio. Incluye mensajes de todos los orígenes, no solo plantillas."
            />
          </p>
        </>
      ) : (
        <p className="text-muted text-sm">No disponible ahora mismo.</p>
      )}
    </Card>
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
                    <td className="max-w-[320px] py-2 font-mono">
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
                      <td className="text-muted max-w-[160px] truncate px-2 py-2">
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
                    >
                      {formatNumber(row.failed)}
                      {row.avoidable > 0 && ` (${row.avoidable} evit.)`}
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
    <Card title="Origen de los envíos" aside={origin === "all" ? "dentro de Salesforce" : "filtrado"}>
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
        Data Cloud solo registra los envíos hechos desde Salesforce. Lo que se envía desde otras herramientas cuenta en
        «Total en Meta», pero no se puede desglosar por plantilla.
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

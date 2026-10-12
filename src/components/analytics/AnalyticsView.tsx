"use client";

import { useMemo, useState } from "react";
import type { Template, Waba } from "@/types/template";
import { rates, type AnalyticsRange, type SummaryAnalytics, type TemplateRow } from "@/lib/analytics/types";
import { daysAgoUtc, fillDays, todayUtc, toWeeks } from "@/lib/analytics/series";
import { useAnalytics } from "@/hooks/useAnalytics";
import {
  BarChart,
  Card,
  ErrorList,
  Kpi,
  LoadError,
  Loading,
  RangePicker,
  sendPoints,
  SourceNote,
  formatNumber,
  formatPercent,
} from "./shared";

const RANGES: AnalyticsRange[] = ["7d", "30d", "90d", "all"];
const RANGE_DAYS: Partial<Record<AnalyticsRange, number>> = { "7d": 7, "30d": 30, "90d": 90 };
const PAGE = 25;

const CATEGORY_LABELS: Record<string, string> = {
  MARKETING_LITE: "Marketing Lite",
  MARKETING: "Marketing",
  UTILITY: "Utilidad",
  SERVICE: "Servicio (gratis)",
  AUTHENTICATION: "Autenticación",
};

interface AnalyticsViewProps {
  wabas: Waba[];
  selectedWabas: Set<string>;
  range: AnalyticsRange;
  onRangeChange: (range: AnalyticsRange) => void;
  onOpenTemplate: (template: Template) => void;
}

export function AnalyticsView({ wabas, selectedWabas, range, onRangeChange, onOpenTemplate }: AnalyticsViewProps) {
  const ids = [...selectedWabas].sort();
  const state = useAnalytics<SummaryAnalytics>(
    `/api/analytics/summary?${new URLSearchParams({ waba: ids.join(","), range })}`,
  );

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

        {state.status === "loading" && <Loading />}
        {state.status === "error" && <LoadError message={state.message} />}
        {state.status === "ready" && (
          <AnalyticsBody
            data={state.data}
            range={range}
            byId={byId}
            showWaba={selected.length !== 1}
            onOpenTemplate={onOpenTemplate}
          />
        )}
      </div>
    </div>
  );
}

function AnalyticsBody({
  data,
  range,
  byId,
  showWaba,
  onOpenTemplate,
}: {
  data: SummaryAnalytics;
  range: AnalyticsRange;
  byId: Map<string, Waba>;
  showWaba: boolean;
  onOpenTemplate: (template: Template) => void;
}) {
  const [visible, setVisible] = useState(PAGE);
  const { totals, meta } = data;
  const r = rates(totals);
  const rangeDays = RANGE_DAYS[range];
  const days = data.daily.map((d) => ({ day: d.day, value: d.sent }));
  const series = rangeDays ? fillDays(days, daysAgoUtc(rangeDays), todayUtc()) : toWeeks(days);

  // The ranking comes from Data Cloud; link each row to the template Meta has (if it still exists).
  const findTemplate = (row: TemplateRow) =>
    byId
      .get(row.waba)
      ?.templates.find((t) => t.name === row.template && t.language.toLowerCase() === row.language.toLowerCase());

  const categories = meta ? Object.entries(meta.byCategory).sort((a, b) => b[1] - a[1]) : [];
  const maxCategory = Math.max(1, ...categories.map(([, n]) => n));

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Plantillas enviadas" value={formatNumber(totals.sent)} sub="desde Salesforce" />
        <Kpi label="Entregadas" value={formatPercent(r.delivery)} sub={`${formatNumber(totals.delivered)} mensajes`} />
        <Kpi label="Leídas" value={formatPercent(r.read)} sub={`${formatNumber(totals.read)} de las entregadas`} />
        <Kpi
          label="Fallos"
          value={formatNumber(totals.failed)}
          sub={`${totals.avoidable} evitables · ${totals.failed - totals.avoidable} ruido`}
          tone={totals.avoidable ? "bad" : undefined}
        />
        <Kpi label="Total en Meta" value={meta ? formatNumber(meta.total) : "—"} sub="todos los orígenes" />
      </div>

      <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
        <Card title={`Plantillas enviadas por ${rangeDays ? "día" : "semana"}`}>
          <BarChart
            label={`Envíos de plantillas: ${formatNumber(totals.sent)} en total`}
            points={sendPoints(series, !rangeDays)}
          />
        </Card>
        <Card title="Volumen en Meta por categoría" aside={range === "all" ? "últimos 90 días" : undefined}>
          {meta ? (
            <>
              {categories.map(([category, n]) => (
                <div key={category} className="mb-2.5">
                  <div className="flex justify-between text-xs">
                    <span>{CATEGORY_LABELS[category] ?? category}</span>
                    <span className="font-mono">{formatNumber(n)}</span>
                  </div>
                  <div className="bg-canvas mt-1 h-2 rounded-full">
                    <div className="bg-accent h-2 rounded-full" style={{ width: `${(n / maxCategory) * 100}%` }} />
                  </div>
                </div>
              ))}
              <p className="text-muted mt-1 text-xs">
                De pago {formatNumber(meta.paid)} · Gratis {formatNumber(meta.free)}
              </p>
            </>
          ) : (
            <p className="text-muted text-sm">No disponible ahora mismo.</p>
          )}
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
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
                    <th className="py-1.5 text-right font-medium">Fallos</th>
                  </tr>
                </thead>
                <tbody>
                  {data.templates.slice(0, visible).map((row) => {
                    const template = findTemplate(row);
                    const rr = rates(row);
                    return (
                      <tr key={`${row.waba}-${row.template}-${row.language}`} className="border-line/70 border-t">
                        <td className="max-w-[360px] py-2 font-mono">
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
                        <td className="px-2 py-2 text-right font-mono">{formatNumber(row.sent)}</td>
                        <td className="px-2 py-2 text-right font-mono">{formatPercent(rr.delivery)}</td>
                        <td className="px-2 py-2 text-right font-mono">{formatPercent(rr.read)}</td>
                        <td
                          className={`py-2 text-right font-mono ${row.avoidable ? "font-semibold text-red-700" : ""}`}
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
        <Card title="Fallos por motivo">
          <ErrorList errors={data.errors} />
        </Card>
      </div>
      <SourceNote />
    </>
  );
}

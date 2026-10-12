"use client";

import { useState } from "react";
import type { Template } from "@/types/template";
import { rates, type AnalyticsRange, type TemplateAnalytics } from "@/lib/analytics/types";
import { daysAgoUtc, fillDays, formatDay, todayUtc, toWeeks } from "@/lib/analytics/series";
import { useAnalytics } from "@/hooks/useAnalytics";
import {
  BarChart,
  Card,
  ErrorList,
  Kpi,
  LoadError,
  Loading,
  RANGE_LABELS,
  RangePicker,
  sendPoints,
  SourceNote,
  formatNumber,
  formatPercent,
} from "./shared";

const RANGES: AnalyticsRange[] = ["30d", "90d", "all"];
const RANGE_DAYS: Partial<Record<AnalyticsRange, number>> = { "30d": 30, "90d": 90 };

/** "Analítica" tab of a template: its sends, delivery, reads and failures from Data Cloud. */
export function TemplateAnalyticsTab({ template, wabaId }: { template: Template; wabaId: string }) {
  const [range, setRange] = useState<AnalyticsRange>("all");
  const query = new URLSearchParams({ waba: wabaId, name: template.name, lang: template.language, range });
  const state = useAnalytics<TemplateAnalytics>(`/api/analytics/template?${query}`);

  return (
    <div className="space-y-4">
      <RangePicker value={range} options={RANGES} onChange={setRange} />
      {state.status === "loading" && <Loading />}
      {state.status === "error" && <LoadError message={state.message} />}
      {state.status === "ready" && <TemplateAnalyticsBody data={state.data} range={range} />}
    </div>
  );
}

function TemplateAnalyticsBody({ data, range }: { data: TemplateAnalytics; range: AnalyticsRange }) {
  const { totals, waba } = data;
  if (totals.sent === 0) {
    return (
      <>
        <p className="text-sm">
          No hay envíos de esta plantilla desde Salesforce en{" "}
          {range === "all" ? "el histórico" : `los últimos ${RANGE_LABELS[range]}`}.
        </p>
        <SourceNote />
      </>
    );
  }

  const own = rates(totals);
  const average = rates(waba);
  const days = data.daily.map((d) => ({ day: d.day, value: d.sent }));
  const rangeDays = RANGE_DAYS[range];
  const series = rangeDays ? fillDays(days, daysAgoUtc(rangeDays), todayUtc()) : toWeeks(days);
  const unit = rangeDays ? "día" : "semana";
  const diff = own.read !== null && average.read !== null ? (own.read - average.read) * 100 : null;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi label="Enviadas" value={formatNumber(totals.sent)} sub={`desde ${formatDay(data.daily[0].day)}`} />
        <Kpi
          label="Entregadas"
          value={formatPercent(own.delivery)}
          sub={`${formatNumber(totals.delivered)} de ${formatNumber(totals.sent)}`}
        />
        <Kpi label="Leídas" value={formatPercent(own.read)} sub={`${formatNumber(totals.read)} de las entregadas`} />
        <Kpi
          label="Fallos"
          value={formatNumber(totals.failed)}
          sub={totals.failed ? `${totals.avoidable} evitables` : "sin incidencias"}
          tone={totals.avoidable ? "bad" : totals.failed ? undefined : "good"}
        />
      </div>

      <Card title={`Envíos por ${unit}`}>
        <BarChart
          label={`Envíos por ${unit}: ${formatNumber(totals.sent)} en total`}
          points={sendPoints(series, !rangeDays)}
        />
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="Frente a su WABA" aside="mismo periodo">
          <Bar label="Lectura de esta plantilla" ratio={own.read} strong />
          <Bar label="Media de la WABA" ratio={average.read} />
          {diff !== null && Math.abs(diff) >= 0.1 && (
            <p className={`mt-2 text-xs ${diff > 0 ? "text-emerald-800" : "text-red-700"}`}>
              {diff > 0 ? "+" : "−"}
              {Math.abs(diff).toFixed(1).replace(".", ",")} puntos {diff > 0 ? "por encima" : "por debajo"} de la media
            </p>
          )}
        </Card>
        <Card title="Fallos">
          <ErrorList errors={data.errors} />
        </Card>
      </div>
      <SourceNote />
    </>
  );
}

function Bar({ label, ratio, strong }: { label: string; ratio: number | null; strong?: boolean }) {
  return (
    <div className="mb-2.5">
      <div className="flex justify-between text-xs">
        <span>{label}</span>
        <strong>{formatPercent(ratio)}</strong>
      </div>
      <div className="bg-canvas mt-1 h-2 rounded-full">
        <div
          className={`h-2 rounded-full ${strong ? "bg-accent" : "bg-faint/60"}`}
          style={{ width: `${Math.round((ratio ?? 0) * 100)}%` }}
        />
      </div>
    </div>
  );
}

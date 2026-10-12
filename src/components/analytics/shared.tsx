"use client";

import { useState, type ReactNode } from "react";
import type { AnalyticsRange, ErrorCount } from "@/lib/analytics/types";
import { formatDay, formatWeekday } from "@/lib/analytics/series";

const numberFormat = new Intl.NumberFormat("es-ES");
export const formatNumber = (n: number) => numberFormat.format(n);
export const formatPercent = (ratio: number | null) =>
  ratio === null ? "—" : `${(ratio * 100).toFixed(1).replace(".", ",")} %`;

export const RANGE_LABELS: Record<AnalyticsRange, string> = {
  "7d": "7 días",
  "30d": "30 días",
  "90d": "90 días",
  all: "Todo",
};

const segmented = (active: boolean) =>
  `h-8 px-3 text-xs ${active ? "bg-ink font-medium text-white" : "bg-surface text-ink/80 hover:bg-canvas"}`;

export function RangePicker({
  value,
  options,
  onChange,
}: {
  value: AnalyticsRange;
  options: AnalyticsRange[];
  onChange: (range: AnalyticsRange) => void;
}) {
  return (
    <div role="group" aria-label="Periodo" className="border-line-strong flex w-fit overflow-hidden rounded-lg border">
      {options.map((range, i) => (
        <button
          key={range}
          type="button"
          onClick={() => onChange(range)}
          aria-pressed={value === range}
          className={`${segmented(value === range)} ${i > 0 ? "border-line-strong border-l" : ""}`}
        >
          {RANGE_LABELS[range]}
        </button>
      ))}
    </div>
  );
}

export function Card({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-line bg-surface rounded-xl border px-4 py-3.5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-[13px] font-semibold">{title}</h2>
        {aside && <span className="text-muted text-xs">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

export function Kpi({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "bad" | "good";
}) {
  return (
    <div className="border-line bg-surface rounded-xl border px-4 py-3.5">
      <div className="text-muted text-xs">{label}</div>
      <div className={`mt-1.5 text-2xl font-semibold tracking-tight ${tone === "bad" ? "text-red-700" : ""}`}>
        {value}
      </div>
      {sub && <div className={`mt-1 text-xs ${tone === "good" ? "text-emerald-800" : "text-muted"}`}>{sub}</div>}
    </div>
  );
}

export interface ChartPoint {
  /** Short label for the axis ("12 oct"). */
  key: string;
  value: number;
  /** Full description shown on hover ("lun, 12 oct: 57 envíos"). */
  title: string;
}

/** Chart points for daily or weekly sends, with the exact date and count on hover. */
export function sendPoints(series: { day: string; value: number }[], weekly: boolean): ChartPoint[] {
  return series.map((p) => ({
    key: formatDay(p.day),
    value: p.value,
    title: `${weekly ? `Semana del ${formatDay(p.day)}` : formatWeekday(p.day)}: ${formatNumber(p.value)} ${
      p.value === 1 ? "envío" : "envíos"
    }`,
  }));
}

/** Indexes of up to `count` evenly spaced axis labels, always including first and last. */
function tickIndexes(length: number, count: number): number[] {
  if (length <= count) return Array.from({ length }, (_, i) => i);
  return Array.from({ length: count }, (_, i) => Math.round((i * (length - 1)) / (count - 1)));
}

/**
 * Vertical bars with a value axis. Hovering or tapping a bar (or moving with the arrow
 * keys once the chart has focus) shows its exact date and value.
 */
export function BarChart({ points, label }: { points: ChartPoint[]; label: string }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...points.map((p) => p.value));
  const n = points.length;
  const current = active !== null ? points[active] : null;
  const center = (i: number) => ((i + 0.5) / n) * 100;
  const height = (value: number) => (value ? Math.max(3, (value / max) * 100) : 2);

  function onKeyDown(event: React.KeyboardEvent) {
    if (n === 0) return;
    const moves: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1 };
    if (event.key in moves) {
      event.preventDefault();
      setActive((i) => Math.min(n - 1, Math.max(0, (i ?? (moves[event.key] > 0 ? -1 : n)) + moves[event.key])));
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setActive(event.key === "Home" ? 0 : n - 1);
    } else if (event.key === "Escape") {
      setActive(null);
    }
  }

  return (
    <div className="pt-6">
      <div className="flex gap-2">
        <div className="text-faint flex h-40 w-9 shrink-0 flex-col justify-between text-right text-[11px] tabular-nums">
          <span className="-mt-1.5">{formatNumber(max)}</span>
          <span>{formatNumber(Math.round(max / 2))}</span>
          <span className="-mb-1.5">0</span>
        </div>
        <div
          role="group"
          aria-label={`${label}. Usa las flechas para recorrer los valores.`}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onMouseLeave={() => setActive(null)}
          onBlur={() => setActive(null)}
          className="focus-visible:ring-accent/40 relative h-40 flex-1 rounded-sm outline-none focus-visible:ring-2"
        >
          <div className="border-line/70 pointer-events-none absolute inset-x-0 top-0 border-t border-dashed" />
          <div className="border-line/70 pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed" />
          <div className="border-line relative flex h-full items-end gap-[3px] border-b">
            {points.map((p, i) => (
              <div
                key={p.key + i}
                data-testid="chart-bar"
                onMouseEnter={() => setActive(i)}
                onClick={() => setActive(i)}
                className="flex h-full min-w-[3px] flex-1 cursor-default items-end"
              >
                <div
                  className={`w-full rounded-t-[3px] transition-colors ${
                    active === i ? "bg-accent" : p.value === max ? "bg-accent/80" : p.value ? "bg-accent/45" : "bg-line"
                  }`}
                  style={{ height: `${height(p.value)}%` }}
                />
              </div>
            ))}
          </div>
          {current && active !== null && (
            <div
              role="status"
              className="bg-ink pointer-events-none absolute z-10 rounded-md px-2 py-1 text-xs whitespace-nowrap text-white shadow-lg"
              style={{
                left: `${center(active)}%`,
                bottom: `calc(${height(current.value)}% + 6px)`,
                transform: `translateX(${center(active) < 15 ? "0" : center(active) > 85 ? "-100%" : "-50%"})`,
              }}
            >
              {current.title}
            </div>
          )}
        </div>
      </div>
      {n > 1 && (
        <div className="text-faint relative mt-1.5 ml-11 h-4 text-[11px]">
          {tickIndexes(n, 6).map((i, k, all) => (
            <span
              key={i}
              className="absolute whitespace-nowrap"
              style={{
                left: `${center(i)}%`,
                transform: `translateX(${k === 0 ? "0" : k === all.length - 1 ? "-100%" : "-50%"})`,
              }}
            >
              {points[i].key}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function ErrorList({ errors }: { errors: ErrorCount[] }) {
  if (errors.length === 0) return <p className="text-sm">Ningún fallo en el periodo.</p>;
  return (
    <>
      <ul className="divide-line/70 divide-y">
        {errors.map((e) => (
          <li key={e.code} className="flex items-center gap-2 py-2 text-xs">
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                e.avoidable ? "bg-red-50 text-red-700" : "bg-canvas text-ink/80"
              }`}
            >
              {e.avoidable ? "Evitable" : "Ruido"}
            </span>
            <span className="min-w-0 flex-1">
              {e.label} <span className="text-faint font-mono">{e.code}</span>
            </span>
            <span className="font-mono">{formatNumber(e.failed)}</span>
          </li>
        ))}
      </ul>
      <p className="text-muted mt-2 text-[11px] leading-relaxed">
        Evitable: configuración o datos nuestros (se puede corregir). Ruido: números sin WhatsApp o límites de Meta.
      </p>
    </>
  );
}

export function Loading() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Cargando analítica">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="shimmer h-24 rounded-xl" />
        ))}
      </div>
      <div className="shimmer h-44 rounded-xl" />
    </div>
  );
}

export function LoadError({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
      {message}
    </p>
  );
}

export function SourceNote() {
  return (
    <p className="text-faint text-[11px] leading-relaxed">
      Fuente: Data Cloud · solo envíos hechos desde Salesforce · «Leídas» requiere que el destinatario tenga activadas
      las confirmaciones de lectura · datos con ~15 min de retraso y caché de 1 h.
    </p>
  );
}

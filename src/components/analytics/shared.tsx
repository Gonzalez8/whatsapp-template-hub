"use client";

import { useId, useState, type ReactNode } from "react";
import type { AnalyticsOrigin, AnalyticsRange, ErrorCount } from "@/lib/analytics/types";
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

export const ORIGIN_LABELS: Record<AnalyticsOrigin, string> = {
  all: "Todos los orígenes",
  mce: "Marketing Cloud",
  de: "Digital Engagement",
};

/** Name of an Application__c value from Data Cloud. */
export function applicationLabel(application: string): string {
  if (application === "MARKETING_CLOUD_ENGAGEMENT") return ORIGIN_LABELS.mce;
  if (application === "DIGITAL_ENGAGEMENT") return ORIGIN_LABELS.de;
  return application || "Sin origen";
}

/** "<1 min", "12 min", "2 h 5 min", "1,5 días" (null → "—"). */
export function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  if (seconds < 60) return "<1 min";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  if (seconds < 86_400) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h} h ${m} min` : `${h} h`;
  }
  return `${(seconds / 86_400).toFixed(1).replace(".", ",")} días`;
}

const segmented = (active: boolean) =>
  `h-8 px-3 text-xs whitespace-nowrap ${active ? "bg-ink font-medium text-white" : "bg-surface text-ink/80 hover:bg-canvas"}`;

/** Buttons where exactly one option is active. */
export function Segmented<T extends string>({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  labels: Record<T, string>;
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="border-line-strong flex w-fit overflow-hidden rounded-lg border">
      {options.map((option, i) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={value === option}
          className={`${segmented(value === option)} ${i > 0 ? "border-line-strong border-l" : ""}`}
        >
          {labels[option]}
        </button>
      ))}
    </div>
  );
}

export function RangePicker({
  value,
  options,
  onChange,
}: {
  value: AnalyticsRange;
  options: AnalyticsRange[];
  onChange: (range: AnalyticsRange) => void;
}) {
  return <Segmented label="Periodo" value={value} options={options} labels={RANGE_LABELS} onChange={onChange} />;
}

/** An ⓘ that shows `text` on hover, tap or keyboard focus. */
export function InfoTip({ label, text }: { label: string; text: string }) {
  const id = useId();
  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        aria-label={label}
        aria-describedby={id}
        className="text-faint hover:text-ink focus-visible:ring-accent/40 rounded-full outline-none focus-visible:ring-2"
      >
        <svg
          viewBox="0 0 16 16"
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden
        >
          <circle cx="8" cy="8" r="6.25" />
          <path d="M8 7.25v3.5M8 5.1v.1" strokeLinecap="round" />
        </svg>
      </button>
      <span
        role="tooltip"
        id={id}
        className="bg-ink invisible absolute top-full left-0 z-20 mt-1.5 w-64 rounded-md px-2.5 py-1.5 text-[11px] leading-snug font-normal text-white opacity-0 shadow-lg transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
      >
        {text}
      </span>
    </span>
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
  /** Stable id passed to onSelect (the day, YYYY-MM-DD). */
  id: string;
  /** Short label for the axis ("12 oct"). */
  key: string;
  value: number;
  /** Full description shown on hover ("lun, 12 oct: 57 envíos"). */
  title: string;
}

/** Chart points for daily or weekly sends, with the exact date and count on hover. */
export function sendPoints(series: { day: string; value: number }[], weekly: boolean): ChartPoint[] {
  return series.map((p) => ({
    id: p.day,
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
 * keys once the chart has focus) shows its exact date and value. With `onSelect`, a
 * click or Enter picks the bar (and a second one un-picks it).
 */
export function BarChart({
  points,
  label,
  selected = null,
  onSelect,
}: {
  points: ChartPoint[];
  label: string;
  selected?: string | null;
  onSelect?: (id: string | null) => void;
}) {
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
    } else if ((event.key === "Enter" || event.key === " ") && onSelect && active !== null) {
      event.preventDefault();
      pick(active);
    }
  }

  function pick(i: number) {
    setActive(i);
    onSelect?.(points[i].id === selected ? null : points[i].id);
  }

  function barColor(p: ChartPoint, i: number) {
    if (active === i || p.id === selected) return "bg-accent";
    if (!p.value) return "bg-line";
    // With a bar picked, the rest step back.
    if (selected) return "bg-accent/25";
    return p.value === max ? "bg-accent/80" : "bg-accent/45";
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
          aria-label={`${label}. Usa las flechas para recorrer los valores${onSelect ? " e Intro para filtrar" : ""}.`}
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
                onClick={() => (onSelect ? pick(i) : setActive(i))}
                aria-current={p.id === selected ? "date" : undefined}
                className={`flex h-full min-w-[3px] flex-1 items-end ${onSelect ? "cursor-pointer" : "cursor-default"}`}
              >
                <div
                  className={`w-full rounded-t-[3px] transition-colors ${barColor(p, i)}`}
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

/** "hace 12 min" for the moment the cached figures were computed. */
function age(generatedAt: number, now = Date.now()) {
  const minutes = Math.max(0, Math.round((now - generatedAt) / 60_000));
  return minutes < 1 ? "hace un momento" : minutes < 60 ? `hace ${minutes} min` : `hace ${Math.round(minutes / 60)} h`;
}

export function SourceNote({ generatedAt }: { generatedAt?: number }) {
  return (
    <p className="text-faint text-[11px] leading-relaxed">
      Fuente: Data Cloud · solo envíos hechos desde Salesforce · «Leídas» requiere que el destinatario tenga activadas
      las confirmaciones de lectura · Data Cloud va ~15 min por detrás de Meta · las cifras se recalculan cada hora
      {generatedAt ? ` (estas, ${age(generatedAt)})` : ""}.
    </p>
  );
}

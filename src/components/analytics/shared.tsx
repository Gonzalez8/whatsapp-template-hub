"use client";

import type { ReactNode } from "react";
import type { AnalyticsRange, ErrorCount } from "@/lib/analytics/types";

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

/** Vertical bars; the tallest uses the accent. Accessible as one image with a text summary. */
export function BarChart({
  points,
  label,
}: {
  points: { key: string; value: number; title: string }[];
  label: string;
}) {
  const max = Math.max(1, ...points.map((p) => p.value));
  return (
    <div role="img" aria-label={label}>
      <div className="border-line flex h-32 items-end gap-[3px] border-b">
        {points.map((p) => (
          <div
            key={p.key}
            title={p.title}
            className={`min-w-[3px] flex-1 rounded-t-[3px] ${p.value === max ? "bg-accent" : p.value ? "bg-accent/45" : "bg-line"}`}
            style={{ height: `${p.value ? Math.max(3, (p.value / max) * 100) : 2}%` }}
          />
        ))}
      </div>
      {points.length > 1 && (
        <div className="text-faint mt-1.5 flex justify-between text-[11px]">
          <span>{points[0].key}</span>
          <span>{points[points.length - 1].key}</span>
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

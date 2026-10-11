"use client";

import { useMemo, useState } from "react";
import type { Waba } from "@/types/template";
import { normalize } from "@/lib/search";

interface WabaSidebarProps {
  wabas: Waba[];
  /** Templates matching the other filters, per WABA. */
  counts: Map<string, number>;
  selected: Set<string>;
  onToggle: (id: string) => void;
  onOnly: (id: string) => void;
  onClear: () => void;
}

/** Multi-select list of WABAs. No selection means every WABA is shown. */
export function WabaSidebar({ wabas, counts, selected, onToggle, onOnly, onClear }: WabaSidebarProps) {
  const [query, setQuery] = useState("");

  // WABAs without any template are noise here; failed ones stay so the error is visible.
  const sorted = useMemo(
    () =>
      wabas
        .filter((w) => w.templates.length > 0 || w.error)
        .sort((a, b) => a.waba_name.localeCompare(b.waba_name, "es", { sensitivity: "base" })),
    [wabas],
  );

  const visible = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return sorted;
    return sorted.filter((w) =>
      normalize(`${w.waba_name} ${w.phone_numbers.map((p) => p.display_phone_number).join(" ")}`).includes(q),
    );
  }, [sorted, query]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-baseline justify-between px-4 pt-4 pb-2">
        <h2 className="text-muted text-xs font-semibold tracking-wider uppercase">WABAs</h2>
        <span className="text-muted text-xs">
          {selected.size === 0 ? `Todas (${sorted.length})` : `${selected.size} de ${sorted.length}`}
        </span>
      </div>

      <div className="px-3">
        <label htmlFor="waba-filter" className="sr-only">
          Filtrar WABAs
        </label>
        <input
          id="waba-filter"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filtrar WABAs"
          className="border-line-strong bg-surface placeholder:text-faint focus:border-accent focus:ring-accent/15 h-9 w-full rounded-lg border px-3 text-[13px] outline-none focus:ring-2"
        />
      </div>

      <div className="flex items-center gap-3 px-4 py-2 text-xs">
        <button
          type="button"
          onClick={onClear}
          disabled={selected.size === 0}
          className="text-accent-ink disabled:text-faint font-medium hover:underline disabled:no-underline"
        >
          Mostrar todas
        </button>
      </div>

      <ul className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-3">
        {visible.map((w) => {
          const checked = selected.has(w.waba_id);
          const count = counts.get(w.waba_id) ?? 0;
          const phone = w.phone_numbers[0]?.display_phone_number;
          return (
            <li key={w.waba_id} className="group relative">
              <label
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg py-1.5 pr-2 pl-2.5 ${
                  checked ? "bg-accent-soft" : "hover:bg-subtle"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(w.waba_id)}
                  className="accent-accent h-4 w-4 shrink-0"
                />
                <span className={`min-w-0 flex-1 ${count === 0 ? "opacity-50" : ""}`}>
                  <span className={`block truncate text-[13px] ${checked ? "font-semibold" : ""}`}>{w.waba_name}</span>
                  {w.error ? (
                    // A failed WABA has no templates, so the list never shows it: flag it here.
                    <span className="block truncate text-[11px] text-red-600" title={w.error}>
                      Error al cargar
                    </span>
                  ) : (
                    <span className="text-faint block truncate font-mono text-[11px]">
                      {phone ?? "Sin número"}
                      {w.phone_numbers.length > 1 && ` +${w.phone_numbers.length - 1}`}
                    </span>
                  )}
                </span>
                <span className="text-muted font-mono text-xs group-focus-within:invisible group-hover:invisible">
                  {count}
                </span>
              </label>
              <button
                type="button"
                onClick={() => onOnly(w.waba_id)}
                aria-label={`Mostrar solo ${w.waba_name}`}
                className="border-line-strong bg-surface text-ink hover:border-accent absolute top-1/2 right-1.5 hidden -translate-y-1/2 rounded-md border px-1.5 py-0.5 text-[11px] font-medium group-focus-within:block group-hover:block"
              >
                Solo
              </button>
            </li>
          );
        })}
        {visible.length === 0 && <li className="text-muted px-3 py-4 text-xs">Ninguna WABA coincide.</li>}
      </ul>
    </div>
  );
}

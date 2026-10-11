"use client";

import { useEffect, useRef } from "react";
import { LastUpdated } from "./LastUpdated";

function isEditable(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

function formatCountdown(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

interface TopBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  fetchedAt: number;
  syncing: boolean;
  cooldown: number;
  syncError: string | null;
  onSync: () => void;
  /** null while comparing: neither view is active. */
  view: "list" | "gallery" | null;
  onViewChange: (view: "list" | "gallery") => void;
  /** Company logo/name from the deployment config, shown before the WhatsApp mark. */
  brand: { name?: string; logoUrl?: string };
}

const segmented = (active: boolean) =>
  `flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] ${
    active ? "bg-accent text-on-accent font-semibold" : "text-chrome-ink/80 hover:bg-white/10 hover:text-white"
  }`;

export function TopBar({
  search,
  onSearchChange,
  fetchedAt,
  syncing,
  cooldown,
  syncError,
  onSync,
  view,
  onViewChange,
  brand,
}: TopBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // "/" or Cmd/Ctrl+K jumps to the search box from anywhere on the page.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const shortcut = (e.key === "/" && !isEditable(e.target)) || (e.key === "k" && (e.metaKey || e.ctrlKey));
      if (!shortcut) return;
      e.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const coolingDown = cooldown > 0;

  return (
    <header className="bg-chrome text-chrome-ink flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:px-5">
      <div className="flex min-w-0 items-center gap-3 lg:min-w-[252px]">
        {brand.logoUrl ? (
          // On a white pill so dark company logos stay visible on the dark bar.
          <span className="flex h-8 items-center rounded-md bg-white px-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- any https URL from the deployment config */}
            <img
              src={brand.logoUrl}
              alt={brand.name ?? "Logo de la empresa"}
              className="h-6 max-w-[120px] object-contain"
            />
          </span>
        ) : (
          brand.name && <span className="truncate text-sm font-semibold">{brand.name}</span>
        )}
        {(brand.logoUrl || brand.name) && <span aria-hidden="true" className="h-6 w-px bg-white/15" />}
        <span className="flex items-center gap-2">
          {/* WhatsApp's own mark and green: it identifies the product, not the company. */}
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#25D366] text-white">
            <svg aria-hidden="true" className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </span>
          <span className="text-[15px] font-semibold tracking-tight whitespace-nowrap">Template Hub</span>
        </span>
      </div>

      <div className="relative order-last w-full sm:order-none sm:max-w-[680px] sm:flex-1">
        <label htmlFor="template-search" className="sr-only">
          Buscar plantillas
        </label>
        <svg
          aria-hidden="true"
          className="text-chrome-muted pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <circle cx="11" cy="11" r="7" strokeWidth="2" />
          <path d="m20 20-3.5-3.5" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          id="template-search"
          type="search"
          autoComplete="off"
          spellCheck={false}
          placeholder="Buscar por nombre, texto, botón o URL…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Escape") return;
            if (search) onSearchChange("");
            else e.currentTarget.blur();
          }}
          className="placeholder:text-chrome-muted focus:border-accent focus:ring-accent/25 h-10 w-full rounded-[10px] border border-white/10 bg-white/[0.07] pr-10 pl-9 text-sm outline-none focus:bg-white/10 focus:ring-2 [&::-webkit-search-cancel-button]:hidden"
        />
        {search ? (
          <button
            type="button"
            onClick={() => {
              onSearchChange("");
              inputRef.current?.focus();
            }}
            aria-label="Limpiar búsqueda"
            className="text-chrome-muted absolute top-1/2 right-1.5 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md hover:bg-white/10 hover:text-white"
          >
            <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeWidth="2.5" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        ) : (
          <kbd
            aria-hidden="true"
            className="text-chrome-muted pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded-[5px] border border-white/15 px-1.5 font-mono text-[11px] sm:block"
          >
            /
          </kbd>
        )}
      </div>

      {/* Always in the same place, whatever the view below looks like. */}
      <div role="group" aria-label="Vista" className="flex gap-0.5 rounded-[10px] bg-white/[0.08] p-[3px]">
        <button
          type="button"
          onClick={() => onViewChange("list")}
          aria-pressed={view === "list"}
          className={segmented(view === "list")}
        >
          <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          Lista
        </button>
        <button
          type="button"
          onClick={() => onViewChange("gallery")}
          aria-pressed={view === "gallery"}
          className={segmented(view === "gallery")}
        >
          <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="4" y="4" width="7" height="7" rx="1.5" strokeWidth="2" />
            <rect x="13" y="4" width="7" height="7" rx="1.5" strokeWidth="2" />
            <rect x="4" y="13" width="7" height="7" rx="1.5" strokeWidth="2" />
            <rect x="13" y="13" width="7" height="7" rx="1.5" strokeWidth="2" />
          </svg>
          Galería
        </button>
      </div>

      <div className="ml-auto flex items-center gap-3">
        {syncError ? (
          <span role="alert" className="max-w-[260px] text-xs text-red-300">
            {syncError}
          </span>
        ) : (
          <span className="text-chrome-muted hidden text-xs md:inline">
            <LastUpdated fetchedAt={fetchedAt} />
          </span>
        )}
        <button
          type="button"
          onClick={onSync}
          disabled={syncing || coolingDown}
          title={coolingDown ? `Disponible en ${formatCountdown(cooldown)}` : "Traer los últimos cambios de Meta"}
          className="hover:border-accent flex h-9 items-center gap-1.5 rounded-lg border border-white/15 px-3 text-[13px] font-medium hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-white/15 disabled:hover:bg-transparent"
        >
          <svg
            aria-hidden="true"
            className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeWidth="2" d="M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5" />
          </svg>
          {syncing ? "Sincronizando…" : coolingDown ? formatCountdown(cooldown) : "Sincronizar"}
        </button>
        <span aria-live="polite" className="sr-only">
          {syncing ? "Sincronizando" : coolingDown ? `Sincronizar disponible en ${formatCountdown(cooldown)}` : ""}
        </span>
      </div>
    </header>
  );
}

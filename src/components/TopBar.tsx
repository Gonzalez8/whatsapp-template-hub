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
}

export function TopBar({ search, onSearchChange, fetchedAt, syncing, cooldown, syncError, onSync }: TopBarProps) {
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
    <header className="border-line bg-surface flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-2.5 sm:px-5">
      <div className="flex items-center gap-2.5 lg:w-[236px]">
        <span className="bg-accent flex h-8 w-8 items-center justify-center rounded-lg text-white">
          <svg
            aria-hidden="true"
            className="h-[18px] w-[18px]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 11.5a8.4 8.4 0 0 1-12.6 7.3L3 20l1.3-5A8.5 8.5 0 1 1 21 11.5z" />
          </svg>
        </span>
        <span className="text-[15px] font-semibold tracking-tight">Template Hub</span>
      </div>

      <div className="relative order-last w-full sm:order-none sm:max-w-[680px] sm:flex-1">
        <label htmlFor="template-search" className="sr-only">
          Buscar plantillas
        </label>
        <svg
          aria-hidden="true"
          className="text-faint pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
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
          className="border-line-strong bg-subtle placeholder:text-faint focus:border-accent focus:bg-surface focus:ring-accent/15 h-10 w-full rounded-[10px] border pr-10 pl-9 text-sm outline-none focus:ring-2 [&::-webkit-search-cancel-button]:hidden"
        />
        {search ? (
          <button
            type="button"
            onClick={() => {
              onSearchChange("");
              inputRef.current?.focus();
            }}
            aria-label="Limpiar búsqueda"
            className="text-faint hover:bg-canvas hover:text-ink absolute top-1/2 right-1.5 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md"
          >
            <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeWidth="2.5" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        ) : (
          <kbd
            aria-hidden="true"
            className="border-line-strong bg-surface text-faint pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded-[5px] border px-1.5 font-mono text-[11px] sm:block"
          >
            /
          </kbd>
        )}
      </div>

      <div className="ml-auto flex items-center gap-3">
        {syncError ? (
          <span role="alert" className="max-w-[260px] text-xs text-red-600">
            {syncError}
          </span>
        ) : (
          <span className="text-muted hidden text-xs md:inline">
            <LastUpdated fetchedAt={fetchedAt} />
          </span>
        )}
        <button
          type="button"
          onClick={onSync}
          disabled={syncing || coolingDown}
          title={coolingDown ? `Disponible en ${formatCountdown(cooldown)}` : "Traer los últimos cambios de Meta"}
          className="border-line-strong bg-surface hover:border-accent hover:text-accent-ink disabled:hover:border-line-strong disabled:hover:text-ink flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium disabled:cursor-not-allowed disabled:opacity-50"
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

"use client";

import { useState, useRef, useEffect, useMemo } from "react";

interface FilterDropdownProps {
  label: string;
  items: { id: string; name: string; count?: number }[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  accentClass?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
}

export function FilterDropdown({
  label,
  items,
  selected,
  onToggle,
  accentClass = "bg-accent",
  searchable = false,
  searchPlaceholder = "Buscar...",
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open && searchable) {
      searchRef.current?.focus();
    }
    if (!open) {
      setQuery("");
    }
  }, [open, searchable]);

  const filteredItems = useMemo(() => {
    if (!searchable || !query) return items;
    const lower = query.toLowerCase();
    return items.filter((item) => item.name.toLowerCase().includes(lower));
  }, [items, query, searchable]);

  const activeCount = selected.size;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium ${
          activeCount > 0
            ? "border-accent bg-accent-soft text-accent-ink"
            : "border-line-strong bg-surface text-ink hover:border-faint"
        }`}
      >
        {label}
        {activeCount > 0 && (
          <span
            className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${accentClass}`}
          >
            {activeCount}
          </span>
        )}
        <svg
          aria-hidden="true"
          className={`text-faint h-3 w-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeWidth="2.5" d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="dropdown-enter border-line bg-surface shadow-ink/10 absolute top-full left-0 z-50 mt-1.5 min-w-56 rounded-xl border shadow-lg"
        >
          {searchable && (
            <div className="border-line border-b p-1.5">
              <div className="relative">
                <svg
                  aria-hidden="true"
                  className="text-faint pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle cx="11" cy="11" r="8" strokeWidth="2" />
                  <path d="m21 21-4.35-4.35" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="border-line-strong bg-surface placeholder:text-faint focus:border-accent focus:ring-accent/15 w-full rounded-lg border py-1.5 pr-2.5 pl-8 text-[12px] outline-none focus:bg-white focus:ring-1"
                />
              </div>
            </div>
          )}
          <div className="max-h-64 overflow-y-auto p-1.5">
            {filteredItems.length === 0 ? (
              <p className="text-faint px-2.5 py-3 text-center text-[12px]">Sin resultados</p>
            ) : (
              filteredItems.map((item) => {
                const isActive = selected.has(item.id);
                return (
                  <button
                    key={item.id}
                    role="option"
                    aria-selected={isActive}
                    onClick={() => onToggle(item.id)}
                    className={`flex min-h-[40px] w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13px] ${
                      isActive ? "bg-accent-soft text-accent-ink" : "text-ink hover:bg-subtle"
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all duration-150 ${
                        isActive ? "border-accent bg-accent text-white" : "border-line-strong bg-surface"
                      }`}
                    >
                      {isActive && (
                        <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    <span className="flex-1 truncate font-medium">{item.name}</span>
                    {item.count !== undefined && <span className="text-muted font-mono text-[11px]">{item.count}</span>}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

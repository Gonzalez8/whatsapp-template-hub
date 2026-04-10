"use client";

import { useState, useRef, useEffect } from "react";

interface FilterDropdownProps {
  label: string;
  items: { id: string; name: string; count?: number }[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  accentClass?: string;
}

export function FilterDropdown({
  label,
  items,
  selected,
  onToggle,
  accentClass = "bg-teal-600",
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

  const activeCount = selected.size;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex min-h-[44px] items-center gap-1.5 rounded-lg border px-3 py-2 text-[12px] font-medium transition-all duration-200 sm:min-h-0 ${
          activeCount > 0
            ? "border-teal-200 bg-teal-50 text-teal-700"
            : "border-gray-200/80 bg-gray-50/50 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
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
          className={`h-3 w-3 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeWidth="2.5" d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div role="listbox" aria-multiselectable="true" className="dropdown-enter absolute top-full right-0 left-0 z-50 mt-2 max-h-64 min-w-52 overflow-y-auto rounded-xl border border-gray-200/80 bg-white p-1.5 shadow-xl shadow-gray-900/[0.08] ring-1 ring-gray-900/[0.03] sm:right-auto">
          {items.map((item) => {
            const isActive = selected.has(item.id);
            return (
              <button
                key={item.id}
                role="option"
                aria-selected={isActive}
                onClick={() => onToggle(item.id)}
                className={`flex w-full min-h-[44px] items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12px] transition-colors duration-150 sm:min-h-0 ${
                  isActive
                    ? "bg-teal-50 text-teal-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all duration-150 ${
                    isActive
                      ? "border-teal-600 bg-teal-600 text-white"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  {isActive && (
                    <svg className="h-2.5 w-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <span className="flex-1 truncate font-medium">{item.name}</span>
                {item.count !== undefined && (
                  <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-400">{item.count}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

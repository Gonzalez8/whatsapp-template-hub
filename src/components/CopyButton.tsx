"use client";

import { useEffect, useState } from "react";

type CopyState = "idle" | "copied" | "error";

interface CopyButtonProps {
  value: string;
  label: string;
  className?: string;
}

/** Copies `value` to the clipboard and confirms it for a moment. */
export function CopyButton({ value, label, className = "" }: CopyButtonProps) {
  const [state, setState] = useState<CopyState>("idle");

  useEffect(() => {
    if (state === "idle") return;
    const id = setTimeout(() => setState("idle"), 1500);
    return () => clearTimeout(id);
  }, [state]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
    } catch {
      // Clipboard API is unavailable outside HTTPS or when the browser denies it.
      setState("error");
    }
  };

  const text = state === "copied" ? "¡Copiado!" : state === "error" ? "No se pudo copiar" : label;

  return (
    <button
      type="button"
      onClick={copy}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors duration-150 ${
        state === "copied"
          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
          : state === "error"
            ? "border-red-200 bg-red-50 text-red-600"
            : "border-gray-200/80 bg-white text-gray-600 hover:border-teal-500 hover:text-teal-700"
      } ${className}`}
    >
      <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {state === "copied" ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m4.5 12.75 6 6 9-13.5" />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-9.376-.408-.115-.832-.207-1.264-.27a8.95 8.95 0 0 0-1.236-.069H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75"
          />
        )}
      </svg>
      <span aria-live="polite">{text}</span>
    </button>
  );
}

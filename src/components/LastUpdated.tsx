"use client";

import { useEffect, useState } from "react";

function formatRelative(fetchedAt: number, now: number): string {
  const minutes = Math.floor((now - fetchedAt) / 60_000);
  if (minutes < 1) return "hace un momento";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `hace ${hours} h`;
}

/** Rendered only after mount: the relative time depends on the viewer's clock. */
export function LastUpdated({ fetchedAt }: { fetchedAt: number }) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const update = () => setLabel(formatRelative(fetchedAt, Date.now()));
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [fetchedAt]);

  if (!label) return null;

  return (
    <time dateTime={new Date(fetchedAt).toISOString()} title={new Date(fetchedAt).toLocaleString("es-ES")}>
      Plantillas actualizadas {label}
    </time>
  );
}

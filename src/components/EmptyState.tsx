export function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
      <svg aria-hidden="true" className="text-faint mb-3 h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="7" strokeWidth="1.5" />
        <path d="m20 20-3.5-3.5" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <p className="text-sm font-semibold">No hay plantillas con estos filtros</p>
      <p className="text-muted mt-1 max-w-[280px] text-[13px]">
        Prueba con otras palabras, marca más WABAs o quita algún filtro.
      </p>
    </div>
  );
}

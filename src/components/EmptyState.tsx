export function EmptyState() {
  return (
    <div className="py-28 text-center">
      <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 ring-1 ring-gray-200/60" />
        <svg
          className="relative h-9 w-9 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.5"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
      </div>
      <p className="font-display text-lg font-bold text-gray-800">
        No se encontraron templates
      </p>
      <p className="mx-auto mt-2 max-w-[280px] text-[13px] leading-relaxed text-gray-500">
        Prueba a cambiar los filtros o el texto de busqueda para encontrar lo que necesitas
      </p>
    </div>
  );
}

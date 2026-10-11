/** Same shell as the dashboard (top bar, sidebar, list, detail) so nothing jumps when data arrives. */
export function SkeletonLoader() {
  return (
    <div className="flex h-dvh flex-col" aria-busy="true" aria-label="Cargando plantillas">
      <div className="border-line bg-surface flex shrink-0 items-center gap-4 border-b px-4 py-2.5 sm:px-5">
        <div className="shimmer h-8 w-8 rounded-lg" />
        <div className="shimmer h-4 w-28 rounded" />
        <div className="shimmer hidden h-10 max-w-[680px] flex-1 rounded-[10px] sm:block" />
        <div className="shimmer ml-auto h-9 w-28 rounded-lg" />
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="border-line bg-surface hidden w-[272px] shrink-0 space-y-3 border-r p-4 lg:block">
          <div className="shimmer h-9 rounded-lg" />
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} className="shimmer h-9 rounded-lg" />
          ))}
        </div>
        <div className="border-line bg-surface flex-1 space-y-2 border-r p-4 lg:max-w-[500px] xl:max-w-[560px]">
          <div className="shimmer mb-4 h-8 w-2/3 rounded-lg" />
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="shimmer h-11 rounded-md" />
          ))}
        </div>
        <div className="hidden flex-1 space-y-4 p-7 lg:block">
          <div className="shimmer h-5 w-1/2 rounded" />
          <div className="shimmer h-4 w-1/4 rounded" />
          <div className="shimmer mt-6 h-72 max-w-[460px] rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

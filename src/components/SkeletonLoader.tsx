/** Same shell as the dashboard (top bar, sidebar, list, detail) so nothing jumps when data arrives. */
export function SkeletonLoader() {
  return (
    <div className="flex h-dvh flex-col" aria-busy="true" aria-label="Cargando plantillas">
      <div className="bg-chrome flex h-[61px] shrink-0 items-center gap-4 px-4 sm:px-5">
        <div className="h-8 w-8 rounded-lg bg-[#25D366]" />
        <div className="h-4 w-28 rounded bg-white/10" />
        <div className="hidden h-10 max-w-[680px] flex-1 rounded-[10px] bg-white/[0.07] sm:block" />
        <div className="ml-auto h-9 w-28 rounded-lg bg-white/10" />
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="bg-side hidden w-[272px] shrink-0 space-y-3 p-4 lg:block">
          {Array.from({ length: 11 }, (_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-lg bg-white/[0.06] motion-reduce:animate-none" />
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

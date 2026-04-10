function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-sm ring-1 ring-gray-900/[0.03]">
      <div className="px-4 pt-4 pb-3">
        <div className="shimmer mb-3 h-4 w-3/4 rounded-md" />
        <div className="flex gap-1.5">
          <div className="shimmer h-5 w-16 rounded-md" />
          <div className="shimmer h-5 w-20 rounded-md" />
          <div className="shimmer h-5 w-10 rounded-md" />
        </div>
      </div>
      <div className="bg-[#efeae2] p-4">
        <div className="space-y-2 rounded-lg bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.08)]">
          <div className="shimmer h-3 w-full rounded" />
          <div className="shimmer h-3 w-5/6 rounded" />
          <div className="shimmer h-3 w-2/3 rounded" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonLoader() {
  return (
    <div className="space-y-12">
      {[1, 2].map((section) => (
        <div key={section}>
          <div className="mb-6 flex items-center gap-3.5">
            <div className="shimmer h-9 w-9 rounded-xl" />
            <div className="shimmer h-4 w-40 rounded-md" />
            <div className="shimmer ml-auto h-6 w-24 rounded-full" />
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((card) => (
              <SkeletonCard key={card} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

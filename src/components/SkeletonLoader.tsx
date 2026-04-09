function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm">
      <div className="px-4 pt-4 pb-3">
        <div className="shimmer mb-2.5 h-4 w-3/4 rounded-md" />
        <div className="flex gap-1.5">
          <div className="shimmer h-5 w-16 rounded-md" />
          <div className="shimmer h-5 w-20 rounded-md" />
          <div className="shimmer h-5 w-10 rounded-md" />
        </div>
      </div>
      <div className="bg-[#efeae2] p-4">
        <div className="space-y-2 rounded-lg bg-white p-3">
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
    <div className="space-y-10">
      {[1, 2].map((section) => (
        <div key={section}>
          <div className="mb-5 flex items-center gap-3">
            <div className="shimmer h-8 w-8 rounded-lg" />
            <div className="shimmer h-4 w-40 rounded-md" />
            <div className="shimmer ml-auto h-6 w-24 rounded-full" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((card) => (
              <SkeletonCard key={card} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

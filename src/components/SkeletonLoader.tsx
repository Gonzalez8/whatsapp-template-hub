function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="px-4 pt-3.5 pb-3">
        <div className="mb-2 h-4 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="flex gap-1.5">
          <div className="h-5 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-5 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-5 w-10 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
      <div className="bg-[#efeae2] p-4 dark:bg-[#1a1a1a]">
        <div className="space-y-2 rounded-lg bg-white p-3 dark:bg-gray-800">
          <div className="h-3 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonLoader() {
  return (
    <div className="space-y-9">
      {[1, 2].map((section) => (
        <div key={section}>
          <div className="mb-4 flex items-center gap-2.5 border-b-2 border-gray-200 pb-2.5 dark:border-gray-700">
            <div className="h-5 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-5 w-8 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
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

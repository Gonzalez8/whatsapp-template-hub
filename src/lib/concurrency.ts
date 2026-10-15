/**
 * Like Promise.allSettled, but runs at most `limit` tasks at the same time.
 * Results keep the order of `items`.
 */
export async function settleWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = { status: "fulfilled", value: await fn(items[i], i) };
      } catch (reason) {
        results[i] = { status: "rejected", reason };
      }
    }
  }

  const workers = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: workers }, worker));
  return results;
}

/**
 * Wraps tasks so that at most `max` run at the same time; the rest wait their turn.
 * Per server instance.
 */
export function createLimiter(max: number) {
  let running = 0;
  const waiting: (() => void)[] = [];
  return async function limit<T>(task: () => Promise<T>): Promise<T> {
    if (running >= max) await new Promise<void>((resolve) => waiting.push(resolve));
    running++;
    try {
      return await task();
    } finally {
      running--;
      waiting.shift()?.();
    }
  };
}

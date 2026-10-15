// @vitest-environment node
import { describe, it, expect } from "vitest";
import { createLimiter, settleWithConcurrency } from "@/lib/concurrency";

const tick = () => new Promise((r) => setTimeout(r, 1));

describe("settleWithConcurrency", () => {
  it("never runs more than `limit` tasks at once", async () => {
    let running = 0;
    let maxRunning = 0;

    await settleWithConcurrency([1, 2, 3, 4, 5, 6, 7], 3, async () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await tick();
      running--;
    });

    expect(maxRunning).toBe(3);
  });

  it("keeps input order and settles failures without rejecting", async () => {
    const results = await settleWithConcurrency([30, 10, 20], 2, async (n) => {
      await new Promise((r) => setTimeout(r, n));
      if (n === 10) throw new Error("boom");
      return n * 2;
    });

    expect(results[0]).toEqual({ status: "fulfilled", value: 60 });
    expect(results[1].status).toBe("rejected");
    expect(results[2]).toEqual({ status: "fulfilled", value: 40 });
  });

  it("handles an empty list", async () => {
    expect(await settleWithConcurrency([], 4, async () => 1)).toEqual([]);
  });
});

describe("createLimiter", () => {
  it("never runs more than the limit, even when a new call arrives as a slot frees", async () => {
    const limit = createLimiter(2);
    let running = 0;
    let maxRunning = 0;
    const task = async () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await tick();
      running--;
    };
    const first = Array.from({ length: 4 }, () => limit(task));
    // Joins right when the first tasks finish and hand their slots to the queue.
    const late = tick().then(() => limit(task));
    await Promise.all([...first, late]);
    expect(maxRunning).toBe(2);
  });
});

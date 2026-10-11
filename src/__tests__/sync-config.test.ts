import { describe, it, expect } from "vitest";
import { SYNC_COOLDOWN_MS, getRetryAfterSeconds } from "@/lib/sync-config";

const NOW = 1_000_000_000_000;

describe("getRetryAfterSeconds", () => {
  it("returns the remaining cooldown in whole seconds", () => {
    expect(getRetryAfterSeconds(NOW - 30_000, NOW)).toBe(90);
    expect(getRetryAfterSeconds(NOW - 119_500, NOW)).toBe(1);
  });

  it("returns 0 once the cooldown has passed", () => {
    expect(getRetryAfterSeconds(NOW - SYNC_COOLDOWN_MS, NOW)).toBe(0);
    expect(getRetryAfterSeconds(NOW - 10 * 60_000, NOW)).toBe(0);
  });

  it("never exceeds the cooldown when the client clock is behind the server", () => {
    const clientOneHourBehind = NOW - 60 * 60_000;
    expect(getRetryAfterSeconds(NOW, clientOneHourBehind)).toBe(SYNC_COOLDOWN_MS / 1000);
  });
});

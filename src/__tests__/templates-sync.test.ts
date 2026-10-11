// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const NOW = new Date("2026-10-11T12:00:00Z").getTime();

const cache = vi.hoisted(() => ({
  revalidateTag: vi.fn(),
  // What the Data Cache currently holds, or an Error when reading it hits a failing Meta.
  snapshot: { wabas: [], fetchedAt: 0 } as { wabas: never[]; fetchedAt: number } | Error,
}));

vi.mock("next/cache", () => ({
  revalidateTag: cache.revalidateTag,
  unstable_cache: () => async () => {
    if (cache.snapshot instanceof Error) throw cache.snapshot;
    return cache.snapshot;
  },
}));

const { requestTemplatesSync, TEMPLATES_TAG } = await import("@/lib/templates");
const { POST } = await import("@/app/api/revalidate/route");

const minutesAgo = (m: number) => NOW - m * 60_000;

beforeEach(() => {
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
  cache.revalidateTag.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("requestTemplatesSync", () => {
  it("revalidates when the snapshot is older than the cooldown", async () => {
    cache.snapshot = { wabas: [], fetchedAt: minutesAgo(3) };

    expect(await requestTemplatesSync()).toEqual({ status: "ok" });
    expect(cache.revalidateTag).toHaveBeenCalledWith(TEMPLATES_TAG);
  });

  it("rejects with retryAfterSeconds when the snapshot is fresh", async () => {
    cache.snapshot = { wabas: [], fetchedAt: minutesAgo(0.5) };

    expect(await requestTemplatesSync()).toEqual({ status: "cooldown", retryAfterSeconds: 90 });
    expect(cache.revalidateTag).not.toHaveBeenCalled();
  });

  it("returns an error result instead of throwing when Meta fails on an empty cache", async () => {
    cache.snapshot = new Error("Listado de WABAs: Invalid OAuth token (HTTP 401)");

    const result = await requestTemplatesSync();

    expect(result.status).toBe("error");
    expect(cache.revalidateTag).not.toHaveBeenCalled();
  });
});

describe("POST /api/revalidate", () => {
  const call = (secret?: string) =>
    POST(
      new Request("http://localhost/api/revalidate", {
        method: "POST",
        headers: secret ? { "x-revalidate-secret": secret } : {},
      }),
    );

  beforeEach(() => {
    vi.stubEnv("REVALIDATE_SECRET", "s3cret");
    cache.snapshot = { wabas: [], fetchedAt: NOW };
  });

  it("rejects missing or wrong secrets", async () => {
    expect((await call()).status).toBe(401);
    expect((await call("wrong")).status).toBe(401);
    expect((await call("s3cret-but-longer")).status).toBe(401);
  });

  it("rejects everything when the secret is not configured", async () => {
    vi.stubEnv("REVALIDATE_SECRET", "");
    expect((await call("")).status).toBe(401);
  });

  it("returns 429 with Retry-After while the snapshot is fresh", async () => {
    const res = await call("s3cret");

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("120");
  });

  it("revalidates with a valid secret once the cooldown has passed", async () => {
    cache.snapshot = { wabas: [], fetchedAt: minutesAgo(5) };
    const res = await call("s3cret");

    expect(res.status).toBe(200);
    expect(cache.revalidateTag).toHaveBeenCalledWith(TEMPLATES_TAG);
  });

  it("returns 502 with a JSON body when Meta is unreachable", async () => {
    cache.snapshot = new Error("boom");
    const res = await call("s3cret");

    expect(res.status).toBe(502);
    expect(await res.json()).toHaveProperty("error");
  });
});

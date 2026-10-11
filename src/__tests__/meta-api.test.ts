// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchWabasWithTemplates, MetaApiError, MetaConfigError } from "@/lib/meta-api";

type Route = (url: URL) => { status?: number; body: unknown };

function mockMeta(route: Route) {
  const fetchMock = vi.fn(async (input: string | URL | Request, _init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input.toString());
    const { status = 200, body } = route(url);
    return new Response(JSON.stringify(body), { status });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const metaError = (message: string) => ({
  status: 400,
  body: { error: { message, code: 100, fbtrace_id: "TRACE123" } },
});

describe("fetchWabasWithTemplates", () => {
  beforeEach(() => {
    vi.stubEnv("META_ACCESS_TOKEN", "token");
    vi.stubEnv("META_BUSINESS_ID", "biz");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("throws MetaConfigError when credentials are missing", async () => {
    vi.stubEnv("META_ACCESS_TOKEN", "");
    await expect(fetchWabasWithTemplates()).rejects.toBeInstanceOf(MetaConfigError);
  });

  it("follows pagination for templates and sends the token as a header", async () => {
    const fetchMock = mockMeta((url) => {
      if (url.pathname.endsWith("/owned_whatsapp_business_accounts"))
        return { body: { data: [{ id: "w1", name: "WABA 1" }] } };
      if (url.pathname.endsWith("/phone_numbers")) return { body: { data: [] } };
      if (url.searchParams.get("after") === "p2") return { body: { data: [{ id: "t2" }] } };
      return {
        body: {
          data: [{ id: "t1" }],
          paging: { next: "https://graph.facebook.com/v23.0/w1/message_templates?after=p2" },
        },
      };
    });

    const [waba] = await fetchWabasWithTemplates();

    expect(waba.templates.map((t) => t.id)).toEqual(["t1", "t2"]);
    const init = fetchMock.mock.calls[0][1];
    expect(init?.headers).toEqual({ Authorization: "Bearer token" });
    expect(fetchMock.mock.calls.every(([u]) => !String(u).includes("access_token"))).toBe(true);
  });

  it("returns a degraded WABA with a short error when only some WABAs fail", async () => {
    mockMeta((url) => {
      if (url.pathname.endsWith("/owned_whatsapp_business_accounts"))
        return {
          body: {
            data: [
              { id: "ok", name: "OK" },
              { id: "bad", name: "Bad" },
            ],
          },
        };
      if (url.pathname.endsWith("/phone_numbers")) return { body: { data: [] } };
      if (url.pathname.startsWith("/v23.0/bad")) return metaError("Invalid WABA");
      return { body: { data: [{ id: "t1" }] } };
    });

    const [ok, bad] = await fetchWabasWithTemplates();

    expect(ok.error).toBeUndefined();
    expect(ok.templates).toHaveLength(1);
    expect(bad.templates).toEqual([]);
    expect(bad.error).toContain("Invalid WABA");
    expect(bad.error).not.toContain("TRACE123");
  });

  it("keeps templates when only the phone numbers call fails", async () => {
    mockMeta((url) => {
      if (url.pathname.endsWith("/owned_whatsapp_business_accounts"))
        return { body: { data: [{ id: "w1", name: "WABA 1" }] } };
      if (url.pathname.endsWith("/phone_numbers")) return metaError("No permission");
      return { body: { data: [{ id: "t1" }] } };
    });

    const [waba] = await fetchWabasWithTemplates();

    expect(waba.error).toBeUndefined();
    expect(waba.templates).toHaveLength(1);
    expect(waba.phone_numbers).toEqual([]);
  });

  it("throws when every WABA fails, so the cached snapshot is kept", async () => {
    mockMeta((url) => {
      if (url.pathname.endsWith("/owned_whatsapp_business_accounts"))
        return { body: { data: [{ id: "w1", name: "WABA 1" }] } };
      return metaError("Rate limit hit");
    });

    await expect(fetchWabasWithTemplates()).rejects.toBeInstanceOf(MetaApiError);
  });

  it("falls back to a generic reason when Meta returns no JSON and no statusText", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<html>Bad gateway</html>", { status: 502 })),
    );

    await expect(fetchWabasWithTemplates()).rejects.toThrow("Listado de WABAs: error (HTTP 502)");
  });

  it("throws when the WABA list cannot be fetched", async () => {
    mockMeta(() => ({ status: 401, body: { error: { message: "Invalid OAuth token" } } }));

    await expect(fetchWabasWithTemplates()).rejects.toMatchObject({
      name: "MetaApiError",
      status: 401,
    });
  });
});

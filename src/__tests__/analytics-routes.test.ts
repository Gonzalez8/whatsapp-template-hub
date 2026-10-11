// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DataCloudError } from "@/lib/datacloud";

const auth = vi.fn();
const getSummaryAnalytics = vi.fn();
const getTemplateAnalytics = vi.fn();

vi.mock("@/auth", () => ({ auth: () => auth() }));
vi.mock("@/lib/analytics", () => ({
  getSummaryAnalytics: (...args: unknown[]) => getSummaryAnalytics(...args),
  getTemplateAnalytics: (...args: unknown[]) => getTemplateAnalytics(...args),
}));
vi.mock("@/lib/templates", () => ({
  getTemplatesSnapshot: async () => ({
    wabas: [
      { waba_id: "2", templates: [{}] },
      { waba_id: "1", templates: [{}] },
      { waba_id: "3", templates: [] },
    ],
  }),
}));

const { GET: summary } = await import("@/app/api/analytics/summary/route");
const { GET: template } = await import("@/app/api/analytics/template/route");

const req = (path: string) => new Request(`http://localhost${path}`);

describe("analytics routes", () => {
  beforeEach(() => {
    vi.stubEnv("SF_INSTANCE_URL", "https://acme.my.salesforce.com");
    vi.stubEnv("SF_ACCESS_TOKEN", "t");
    vi.stubEnv("NODE_ENV", "development");
    getSummaryAnalytics.mockResolvedValue({ ok: true });
    getTemplateAnalytics.mockResolvedValue({ ok: true });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it("answers 404 when analytics is off", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const res = await summary(req("/api/analytics/summary?range=30d"));
    expect(res.status).toBe(404);
    expect(getSummaryAnalytics).not.toHaveBeenCalled();
  });

  it("answers 401 without a session when login is on", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_MICROSOFT_ENTRA_ID_ID", "id");
    vi.stubEnv("AUTH_MICROSOFT_ENTRA_ID_SECRET", "secret");
    vi.stubEnv("AUTH_MICROSOFT_ENTRA_ID_ISSUER", "https://login.microsoftonline.com/t/v2.0");
    vi.stubEnv("AUTH_SECRET", "s");
    auth.mockResolvedValueOnce(null);
    expect((await summary(req("/api/analytics/summary?range=30d"))).status).toBe(401);

    auth.mockResolvedValueOnce({ user: { email: "a@b.com" } });
    expect((await summary(req("/api/analytics/summary?range=30d"))).status).toBe(200);
  });

  it("uses every WABA with templates when none is given, and never caches publicly", async () => {
    const res = await summary(req("/api/analytics/summary?range=7d"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(getSummaryAnalytics).toHaveBeenCalledWith(["1", "2"], "7d");

    await summary(req("/api/analytics/summary?range=30d&waba=9,8,9"));
    expect(getSummaryAnalytics).toHaveBeenLastCalledWith(["8", "9"], "30d");
  });

  it("answers 400 for a bad range or missing template params", async () => {
    expect((await summary(req("/api/analytics/summary?range=1y"))).status).toBe(400);
    expect((await template(req("/api/analytics/template?range=all&waba=1&name=x"))).status).toBe(400);
  });

  it("answers 502 when Data Cloud fails", async () => {
    getTemplateAnalytics.mockRejectedValueOnce(new DataCloudError("La consulta a Data Cloud falló (HTTP 500)"));
    const res = await template(req("/api/analytics/template?range=all&waba=1&name=x&lang=ES_ES"));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "La consulta a Data Cloud falló (HTTP 500)" });
  });

  it("passes the template with a lower-cased language", async () => {
    const res = await template(req("/api/analytics/template?range=90d&waba=1&name=x&lang=ES_ES"));
    expect(res.status).toBe(200);
    expect(getTemplateAnalytics).toHaveBeenCalledWith("1", "x", "es_es", "90d");
  });
});

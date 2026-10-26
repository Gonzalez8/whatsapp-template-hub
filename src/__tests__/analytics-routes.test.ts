// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DataCloudError } from "@/lib/datacloud";
import { parsePeriod } from "@/lib/analytics/http";
import { ANALYTICS_REQUESTS_PER_MINUTE, resetRateLimit } from "@/lib/analytics/rate-limit";

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
      { waba_id: "2", templates: [{ name: "y", language: "es" }] },
      { waba_id: "1", templates: [{ name: "x", language: "es_ES" }] },
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
    vi.stubEnv("DATACLOUD_WHATSAPP_DLO", "MessagingEventsWhatsAppV2_Acme__dll");
    vi.stubEnv("SF_ACCESS_TOKEN", "t");
    vi.stubEnv("NODE_ENV", "development");
    resetRateLimit();
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
    expect(getSummaryAnalytics).toHaveBeenCalledWith(["1", "2"], "7d", "all", null);

    await summary(req("/api/analytics/summary?range=30d&waba=2,1,2"));
    expect(getSummaryAnalytics).toHaveBeenLastCalledWith(["1", "2"], "30d", "all", null);
  });

  it("passes the origin and a day or week", async () => {
    await summary(req("/api/analytics/summary?range=all&waba=1&origin=de&from=2026-10-05&to=2026-10-12"));
    expect(getSummaryAnalytics).toHaveBeenLastCalledWith(["1"], "all", "de", { from: "2026-10-05", to: "2026-10-12" });
  });

  it.each([
    ["an unknown origin", "origin=x"],
    ["only one end of the period", "from=2026-10-05"],
    ["a period over a week", "from=2026-10-01&to=2026-10-20"],
    ["an empty period", "from=2026-10-05&to=2026-10-05"],
    ["a malformed date", "from=2026-10-05&to=hoy"],
    ["a day before the range", "from=2025-01-01&to=2025-01-02"],
    ["a day in the future", "from=2099-01-01&to=2099-01-02"],
  ])("answers 400 for %s", async (_, query) => {
    expect((await summary(req(`/api/analytics/summary?range=30d&waba=1&${query}`))).status).toBe(400);
  });

  it("only answers about WABAs and templates of this Meta account", async () => {
    expect((await summary(req("/api/analytics/summary?range=30d&waba=1,999"))).status).toBe(400);
    expect((await template(req("/api/analytics/template?range=all&waba=1&name=y&lang=es"))).status).toBe(404);
    expect((await template(req("/api/analytics/template?range=all&waba=999&name=x&lang=es_ES"))).status).toBe(404);
    expect(getSummaryAnalytics).not.toHaveBeenCalled();
    expect(getTemplateAnalytics).not.toHaveBeenCalled();
  });

  it("limits requests per person and minute", async () => {
    const url = "/api/analytics/summary?range=30d";
    for (let i = 0; i < ANALYTICS_REQUESTS_PER_MINUTE; i++) expect((await summary(req(url))).status).toBe(200);
    const res = await summary(req(url));
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
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

describe("parsePeriod", () => {
  const now = Date.parse("2026-10-13T10:00:00Z");

  it("accepts a day inside 7, 30 or 90 days and a Monday week for the whole history", () => {
    expect(parsePeriod("2026-10-13", "2026-10-14", "7d", now)).toEqual({ from: "2026-10-13", to: "2026-10-14" });
    expect(parsePeriod("2026-09-13", "2026-09-14", "30d", now)).not.toBeNull();
    expect(parsePeriod("2026-10-05", "2026-10-12", "all", now)).not.toBeNull();
    expect(parsePeriod(null, null, "30d", now)).toBeNull();
  });

  it.each([
    ["a day outside 7 days", "2026-10-01", "2026-10-02", "7d"],
    ["a week in a daily range", "2026-10-05", "2026-10-12", "30d"],
    ["a week not starting on Monday", "2026-10-06", "2026-10-13", "all"],
    ["a single day in the whole history", "2026-10-05", "2026-10-06", "all"],
    ["tomorrow", "2026-10-14", "2026-10-15", "7d"],
  ] as const)("rejects %s", (_, from, to, range) => {
    expect(() => parsePeriod(from, to, range, now)).toThrow("Periodo no válido");
  });
});

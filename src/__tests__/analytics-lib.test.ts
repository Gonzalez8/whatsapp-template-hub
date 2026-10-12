// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getDataCloudConfig, queryDataCloud, resetDataCloudToken, toRows, DataCloudError } from "@/lib/datacloud";
import { getAnalyticsConfig } from "@/lib/analytics/config";
import { describeError } from "@/lib/analytics/errors";
import {
  DEFAULT_WHATSAPP_DLO,
  InvalidQueryParam,
  errorsSql,
  summaryDailySql,
  templateDailySql,
  templateRankingSql,
} from "@/lib/analytics/queries";
import { fillDays, toWeeks } from "@/lib/analytics/series";
import { rates } from "@/lib/analytics/types";
import { fetchMetaVolume } from "@/lib/meta-analytics";

const SF = { SF_INSTANCE_URL: "https://acme.my.salesforce.com/" };
const ENTRA = {
  AUTH_MICROSOFT_ENTRA_ID_ID: "id",
  AUTH_MICROSOFT_ENTRA_ID_SECRET: "secret",
  AUTH_MICROSOFT_ENTRA_ID_ISSUER: "https://login.microsoftonline.com/t/v2.0",
  AUTH_SECRET: "s",
};

describe("getDataCloudConfig", () => {
  it("stays off without an https instance URL and credentials", () => {
    expect(getDataCloudConfig({})).toEqual({ status: "disabled" });
    expect(getDataCloudConfig(SF)).toEqual({ status: "disabled" });
    expect(getDataCloudConfig({ SF_INSTANCE_URL: "http://acme.my.salesforce.com", SF_ACCESS_TOKEN: "t" })).toEqual({
      status: "disabled",
    });
  });

  it("prefers client credentials over a raw token", () => {
    expect(getDataCloudConfig({ ...SF, SF_CLIENT_ID: "id", SF_CLIENT_SECRET: "secret", SF_ACCESS_TOKEN: "t" })).toEqual(
      {
        status: "client-credentials",
        instanceUrl: "https://acme.my.salesforce.com",
        clientId: "id",
        clientSecret: "secret",
      },
    );
    expect(getDataCloudConfig({ ...SF, SF_ACCESS_TOKEN: "t" })).toEqual({
      status: "access-token",
      instanceUrl: "https://acme.my.salesforce.com",
      accessToken: "t",
    });
  });
});

describe("getAnalyticsConfig", () => {
  const dc = { ...SF, SF_ACCESS_TOKEN: "t" };

  it("is off without Data Cloud", () => {
    expect(getAnalyticsConfig({ ...ENTRA })).toEqual({ status: "disabled", reason: "no-datacloud" });
  });

  it("requires login outside local development", () => {
    expect(getAnalyticsConfig({ ...dc, NODE_ENV: "production" })).toEqual({
      status: "disabled",
      reason: "needs-login",
    });
    expect(getAnalyticsConfig({ ...dc, ...ENTRA, NODE_ENV: "production" })).toEqual({
      status: "enabled",
      requiresSession: true,
    });
    expect(getAnalyticsConfig({ ...dc, NODE_ENV: "development" })).toEqual({
      status: "enabled",
      requiresSession: false,
    });
  });

  it("allows previews without login only with ANALYTICS_WITHOUT_LOGIN, never production", () => {
    const flag = { ...dc, NODE_ENV: "production", ANALYTICS_WITHOUT_LOGIN: "true" };
    expect(getAnalyticsConfig({ ...flag, VERCEL_ENV: "preview" })).toEqual({
      status: "enabled",
      requiresSession: false,
    });
    expect(getAnalyticsConfig({ ...flag, VERCEL_ENV: "production" })).toEqual({
      status: "disabled",
      reason: "needs-login",
    });
    expect(getAnalyticsConfig({ ...flag, ANALYTICS_WITHOUT_LOGIN: "1", VERCEL_ENV: "preview" }).status).toBe(
      "disabled",
    );
  });
});

describe("toRows", () => {
  it("maps positional rows to columns in placeInOrder", () => {
    const rows = toRows({
      data: [
        [5, "2026-10-01"],
        [7, null],
      ],
      metadata: { day: { placeInOrder: 1 }, sent: { placeInOrder: 0 } },
    });
    expect(rows).toEqual([
      { sent: 5, day: "2026-10-01" },
      { sent: 7, day: null },
    ]);
    expect(toRows({})).toEqual([]);
  });
});

describe("queryDataCloud", () => {
  beforeEach(() => {
    resetDataCloudToken();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const config = {
    status: "client-credentials" as const,
    instanceUrl: "https://acme.my.salesforce.com",
    clientId: "id",
    clientSecret: "secret",
  };

  it("gets a token once and reuses it", async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.endsWith("/oauth2/token")
        ? Response.json({ access_token: "tok", instance_url: "https://acme.my.salesforce.com" })
        : Response.json({ data: [[1]], metadata: { n: { placeInOrder: 0 } } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    expect(await queryDataCloud("SELECT 1", config)).toEqual([{ n: 1 }]);
    await queryDataCloud("SELECT 1", config);
    const urls = fetchMock.mock.calls.map(([url]) => url);
    expect(urls.filter((u) => u.endsWith("/oauth2/token"))).toHaveLength(1);
    expect(urls.filter((u) => u.endsWith("/ssot/queryv2"))).toHaveLength(2);
  });

  it("throws DataCloudError on auth or query failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ error: "invalid_client" }, { status: 400 })),
    );
    await expect(queryDataCloud("SELECT 1", config)).rejects.toBeInstanceOf(DataCloudError);

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nope", { status: 500 })),
    );
    await expect(
      queryDataCloud("SELECT 1", { status: "access-token", instanceUrl: config.instanceUrl, accessToken: "t" }),
    ).rejects.toThrow("HTTP 500");
    await expect(queryDataCloud("SELECT 1", { status: "disabled" })).rejects.toBeInstanceOf(DataCloudError);
  });
});

describe("analytics SQL", () => {
  const scope = { dlo: DEFAULT_WHATSAPP_DLO, since: "2026-09-11" };

  it("filters by WABA, template, language and date", () => {
    const sql = templateDailySql(scope, "741822361776098", "campus_confirmation_orbi_es", "ES_ES");
    expect(sql).toContain("ExternalAccountId__c IN ('741822361776098')");
    expect(sql).toContain("= 'campus_confirmation_orbi_es'");
    expect(sql).toContain("= 'es_es'");
    expect(sql).toContain("EventDateTime__c >= '2026-09-11'");
    expect(sql).not.toMatch(/LIKE/);
  });

  it("counts WhatsApp codes with and without the WA- prefix as avoidable", () => {
    const sql = templateRankingSql(scope, []);
    expect(sql).toContain("'WA-132000','132000'");
    expect(sql).toContain("'SF-3060'");
    expect(sql).not.toContain("ExternalAccountId__c IN");
  });

  it("omits the date filter for the whole history", () => {
    expect(summaryDailySql({ ...scope, since: null }, ["1"])).not.toContain("EventDateTime__c >=");
    expect(errorsSql(scope, ["1"])).toContain("f.EventDateTime__c >= '2026-09-11'");
  });

  it.each([
    ["WABA", () => templateRankingSql(scope, ["1' OR '1'='1"])],
    ["template", () => templateDailySql(scope, "1", "x'; DROP TABLE t; --", "es")],
    ["language", () => templateDailySql(scope, "1", "ok", "es') OR ('1")],
    ["date", () => summaryDailySql({ ...scope, since: "2026-01-01' OR 1=1" }, [])],
    ["DLO", () => summaryDailySql({ dlo: "Account; --", since: null }, [])],
  ])("rejects an injected %s", (_, build) => {
    expect(build).toThrow(InvalidQueryParam);
  });
});

describe("describeError", () => {
  it("classifies prefixed and bare codes the same way", () => {
    expect(describeError("WA-132000", 3)).toMatchObject({ avoidable: true, failed: 3 });
    expect(describeError("132000", 1).avoidable).toBe(true);
    expect(describeError("SF-3060", 1).avoidable).toBe(true);
    expect(describeError("WA-131026", 9)).toMatchObject({
      avoidable: false,
      label: "Número sin WhatsApp o no alcanzable",
    });
    expect(describeError("999", 1)).toMatchObject({ avoidable: false, label: "Otro motivo" });
  });
});

describe("series", () => {
  it("fills missing days with zero", () => {
    expect(fillDays([{ day: "2026-10-02", value: 4 }], "2026-10-01", "2026-10-03")).toEqual([
      { day: "2026-10-01", value: 0 },
      { day: "2026-10-02", value: 4 },
      { day: "2026-10-03", value: 0 },
    ]);
  });

  it("sums into Monday weeks, keeping empty weeks", () => {
    // 2026-10-01 is a Thursday; 2026-10-14 is a Wednesday two weeks later.
    expect(
      toWeeks([
        { day: "2026-10-01", value: 2 },
        { day: "2026-10-04", value: 3 },
        { day: "2026-10-14", value: 1 },
      ]),
    ).toEqual([
      { day: "2026-09-28", value: 5 },
      { day: "2026-10-05", value: 0 },
      { day: "2026-10-12", value: 1 },
    ]);
    expect(toWeeks([])).toEqual([]);
  });

  it("computes rates without dividing by zero", () => {
    expect(rates({ sent: 10, delivered: 8, read: 4, failed: 2, avoidable: 0 })).toEqual({ delivery: 0.8, read: 0.5 });
    expect(rates({ sent: 0, delivered: 0, read: 0, failed: 0, avoidable: 0 })).toEqual({ delivery: null, read: null });
  });
});

describe("fetchMetaVolume", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("sums volume by category and paid/free, skipping WABAs that fail", async () => {
    vi.stubEnv("META_ACCESS_TOKEN", "token");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.includes("/bad?")
          ? new Response("{}", { status: 400 })
          : Response.json({
              pricing_analytics: {
                data: [
                  {
                    data_points: [
                      { volume: 5, pricing_category: "MARKETING", pricing_type: "REGULAR" },
                      { volume: 2, pricing_category: "SERVICE", pricing_type: "FREE_CUSTOMER_SERVICE" },
                      // Service messages are free even when Meta reports the standard (REGULAR) rate.
                      { volume: 4, pricing_category: "SERVICE", pricing_type: "REGULAR" },
                      { volume: 1, pricing_category: "UTILITY", pricing_type: "FREE_CUSTOMER_SERVICE" },
                    ],
                  },
                ],
              },
            }),
      ),
    );
    expect(await fetchMetaVolume(["a", "bad"], 30)).toEqual({
      total: 12,
      paid: 5,
      free: 7,
      byCategory: { MARKETING: 5, SERVICE: 6, UTILITY: 1 },
    });
  });

  it("returns null when Meta can't be reached", async () => {
    vi.stubEnv("META_ACCESS_TOKEN", "token");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 500 })),
    );
    expect(await fetchMetaVolume(["a"], 30)).toBeNull();
  });
});

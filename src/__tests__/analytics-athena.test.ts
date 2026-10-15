// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// A fake Athena: each command is recorded and answered from `script`.
const sent: { command: string; input: Record<string, unknown> }[] = [];
let script: (command: string, input: Record<string, unknown>) => unknown;

vi.mock("@aws-sdk/client-athena", () => {
  const command = (name: string) =>
    class {
      static commandName = name;
      constructor(public input: Record<string, unknown>) {}
    };
  return {
    AthenaClient: class {
      async send(cmd: { input: Record<string, unknown>; constructor: { commandName: string } }) {
        const name = cmd.constructor.commandName;
        sent.push({ command: name, input: cmd.input });
        return script(name, cmd.input);
      }
    },
    StartQueryExecutionCommand: command("Start"),
    GetQueryExecutionCommand: command("Get"),
    GetQueryResultsCommand: command("Results"),
    StopQueryExecutionCommand: command("Stop"),
  };
});

const { getAthenaConfig, queryAthena, resetAthenaClient, AthenaError } = await import("@/lib/athena");
const { getAnalyticsSource } = await import("@/lib/analytics/source");
const { getAnalyticsConfig } = await import("@/lib/analytics/config");
const { athenaDialect, templateRankingSql } = await import("@/lib/analytics/queries");
const { QuerySourceError } = await import("@/lib/query-error");

const ATHENA = { ATHENA_REGION: "eu-west-1", ATHENA_TABLE: "nt_staging__data_cloud.stg_whatsapp_events" };
const enabled = getAthenaConfig(ATHENA);

const row = (...values: (string | null)[]) => ({ Data: values.map((v) => (v === null ? {} : { VarCharValue: v })) });

beforeEach(() => {
  sent.length = 0;
  resetAthenaClient();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("getAthenaConfig", () => {
  it("is off without region or table, and uses the primary workgroup by default", () => {
    expect(getAthenaConfig({})).toEqual({ status: "disabled" });
    expect(getAthenaConfig({ ATHENA_REGION: "eu-west-1" })).toEqual({ status: "disabled" });
    expect(enabled).toEqual({
      status: "enabled",
      region: "eu-west-1",
      table: "nt_staging__data_cloud.stg_whatsapp_events",
      workgroup: "primary",
      outputLocation: undefined,
      credentials: undefined,
    });
  });

  it("takes a technical user's key only when it is a real one and both halves are set", () => {
    const key = "AKIAABCDEFGHIJKLMNOP";
    const keyed = getAthenaConfig({ ...ATHENA, ATHENA_ACCESS_KEY_ID: key, ATHENA_SECRET_ACCESS_KEY: "s" });
    expect(keyed).toMatchObject({ credentials: { accessKeyId: key, secretAccessKey: "s" } });
    expect(getAthenaConfig({ ...ATHENA, ATHENA_ACCESS_KEY_ID: key })).toMatchObject({ credentials: undefined });
    const placeholder = { ...ATHENA, ATHENA_ACCESS_KEY_ID: "PENDIENTE", ATHENA_SECRET_ACCESS_KEY: "PENDIENTE" };
    expect(getAthenaConfig(placeholder)).toMatchObject({ status: "enabled", credentials: undefined });
  });

  it("stays off on Vercel until there is a real key: there is no AWS session to fall back on", () => {
    const placeholder = { ...ATHENA, VERCEL: "1", ATHENA_ACCESS_KEY_ID: "PENDIENTE", ATHENA_SECRET_ACCESS_KEY: "x" };
    expect(getAthenaConfig(placeholder)).toEqual({ status: "disabled" });
    const keyed = { ...placeholder, ATHENA_ACCESS_KEY_ID: "AKIAABCDEFGHIJKLMNOP" };
    expect(getAthenaConfig(keyed)).toMatchObject({ status: "enabled" });
  });
});

describe("getAnalyticsSource", () => {
  const dataCloud = { SF_INSTANCE_URL: "https://acme.my.salesforce.com", SF_ACCESS_TOKEN: "t" };

  it("prefers Athena, then Data Cloud, else none", () => {
    expect(getAnalyticsSource({ ...dataCloud, ...ATHENA }).kind).toBe("athena");
    expect(getAnalyticsSource(dataCloud).kind).toBe("datacloud");
    expect(getAnalyticsSource({}).kind).toBe("none");
  });

  it("turns analytics on with Athena alone", () => {
    expect(getAnalyticsConfig({ ...ATHENA, NODE_ENV: "development" })).toEqual({
      status: "enabled",
      requiresSession: false,
    });
  });
});

describe("athenaDialect", () => {
  it("writes Athena SQL over the snake_case copy, unescaping the HTML-escaped message", () => {
    const sql = templateRankingSql({ dialect: athenaDialect("db.events"), since: "2026-09-11" }, ["1"]);
    expect(sql).toContain("FROM db.events");
    expect(sql).toContain("event_at >= TIMESTAMP '2026-09-11 00:00:00'");
    expect(sql).toContain("external_account_id IN ('1')");
    expect(sql).toContain("json_extract_scalar(replace(");
    expect(sql).toContain("'&quot;', '\"'");
    expect(sql).not.toContain("__c");
  });

  it("reads receipts without touching the message, and totals by origin in one pass", async () => {
    const { overviewSql } = await import("@/lib/analytics/queries");
    const scope = { dialect: athenaDialect("db.events"), since: "2026-09-11" };
    const sql = overviewSql(scope, ["1"]);
    expect(sql).toContain("GROUP BY GROUPING SETS ((m.origin), ())");
    expect(sql).not.toContain("UNION ALL");
    // The receipts' wamids come from the send events directly, not from the `sends` CTE.
    expect(sql).not.toContain("SELECT wamid FROM sends");
  });
});

describe("queryAthena", () => {
  it("starts the query, waits for it and reads every page of results by column name", async () => {
    let polls = 0;
    script = (command, input) => {
      if (command === "Start") return { QueryExecutionId: "q1" };
      if (command === "Get") return { QueryExecution: { Status: { State: ++polls < 2 ? "RUNNING" : "SUCCEEDED" } } };
      if (command === "Results" && !input.NextToken) {
        return {
          ResultSet: {
            ResultSetMetadata: { ColumnInfo: [{ Name: "waba" }, { Name: "sent" }] },
            Rows: [row("waba", "sent"), row("111", "5")],
          },
          NextToken: "p2",
        };
      }
      return { ResultSet: { Rows: [row("222", null)] } };
    };

    expect(await queryAthena("SELECT 1", enabled)).toEqual([
      { waba: "111", sent: "5" },
      { waba: "222", sent: null },
    ]);
    expect(sent[0]).toEqual({ command: "Start", input: expect.objectContaining({ WorkGroup: "primary" }) });
  });

  it("reports a failed query as a source error (shown as 502)", async () => {
    script = (command) =>
      command === "Start"
        ? { QueryExecutionId: "q2" }
        : { QueryExecution: { Status: { State: "FAILED", StateChangeReason: "COLUMN_NOT_FOUND" } } };
    const error = await queryAthena("SELECT nope", enabled).catch((e) => e);
    expect(error).toBeInstanceOf(AthenaError);
    expect(error).toBeInstanceOf(QuerySourceError);
    expect(error.message).toContain("COLUMN_NOT_FOUND");
  });

  it("hides AWS details such as expired credentials behind a generic message", async () => {
    script = () => {
      throw Object.assign(new Error("The SSO session has expired"), { name: "CredentialsProviderError" });
    };
    const error = await queryAthena("SELECT 1", enabled).catch((e) => e);
    expect(error).toBeInstanceOf(AthenaError);
    expect(error.message).toBe("No se pudo consultar Athena (CredentialsProviderError)");
  });

  it("refuses to run without configuration", async () => {
    await expect(queryAthena("SELECT 1", { status: "disabled" })).rejects.toBeInstanceOf(AthenaError);
  });
});

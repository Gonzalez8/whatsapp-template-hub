import { getAthenaConfig, queryAthena } from "@/lib/athena";
import { getDataCloudConfig, queryDataCloud } from "@/lib/datacloud";
import type { Row } from "@/lib/query-error";
import { athenaDialect, dataCloudDialect, type Dialect } from "./queries";

type Env = Record<string, string | undefined>;

export type AnalyticsSource =
  | { kind: "none" }
  | { kind: "athena" | "datacloud"; dialect: Dialect; run: (sql: string) => Promise<Row[]> };

/**
 * Where the WhatsApp events are read from. Athena (a copy of the Data Cloud table in
 * a data lake) wins when configured: its queries cost a fraction of Data Cloud's.
 */
export function getAnalyticsSource(env: Env = process.env): AnalyticsSource {
  const athena = getAthenaConfig(env);
  if (athena.status === "enabled") {
    return { kind: "athena", dialect: athenaDialect(athena.table), run: (sql) => queryAthena(sql, athena) };
  }
  // Data Cloud needs the events object too: its name differs in every org.
  const dataCloud = getDataCloudConfig(env);
  const dlo = env.DATACLOUD_WHATSAPP_DLO?.trim();
  if (dataCloud.status !== "disabled" && dlo) {
    return {
      kind: "datacloud",
      dialect: dataCloudDialect(dlo),
      run: (sql) => queryDataCloud(sql, dataCloud),
    };
  }
  return { kind: "none" };
}

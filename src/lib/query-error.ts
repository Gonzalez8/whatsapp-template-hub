/** A query to the analytics source (Data Cloud, Athena) failed: shown as a 502. */
export class QuerySourceError extends Error {
  name = "QuerySourceError";
}

/** One result row, by column name. */
export type Row = Record<string, string | number | null>;

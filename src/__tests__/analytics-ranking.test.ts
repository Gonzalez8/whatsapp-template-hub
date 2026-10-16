// @vitest-environment node
import { describe, it, expect } from "vitest";
import { lowRates, sortTemplates } from "@/lib/analytics/ranking";
import type { ReadCounts, TemplateRow } from "@/lib/analytics/types";

const row = (template: string, sent: number, delivered: number, read: number, failed = 0): TemplateRow => ({
  waba: "1",
  template,
  language: "es",
  sent,
  delivered,
  read,
  failed,
  avoidable: 0,
  readMedian: null,
});
const totals: ReadCounts = { sent: 1000, delivered: 950, read: 665, failed: 50, avoidable: 0, readMedian: null };

describe("sortTemplates", () => {
  const rows = [row("big", 500, 480, 300), row("low", 200, 160, 120), row("tiny", 3, 2, 2), row("high", 150, 150, 140)];
  const names = (r: TemplateRow[]) => r.map((x) => x.template);

  it("orders by sends, highest first, by default", () => {
    expect(names(sortTemplates(rows, { key: "sent", direction: "desc" }))).toEqual(["big", "low", "high", "tiny"]);
  });

  it("orders by a rate both ways, with templates with too few sends after the rest, ordered too", () => {
    const all = [...rows, row("tiny-high", 5, 5, 5), row("tiny-low", 4, 1, 1)];
    expect(names(sortTemplates(all, { key: "delivery", direction: "asc" }))).toEqual([
      "low",
      "big",
      "high",
      "tiny-low",
      "tiny",
      "tiny-high",
    ]);
    expect(names(sortTemplates(all, { key: "delivery", direction: "desc" }))).toEqual([
      "high",
      "big",
      "low",
      "tiny-high",
      "tiny",
      "tiny-low",
    ]);
  });

  it("leaves missing values last", () => {
    const withTime = [
      { ...row("a", 100, 90, 50), readMedian: 60 },
      row("none", 300, 0, 0),
      { ...row("b", 100, 90, 50), readMedian: 30 },
    ];
    expect(names(sortTemplates(withTime, { key: "readMedian", direction: "asc" }))).toEqual(["b", "a", "none"]);
  });
});

describe("lowRates", () => {
  it("flags delivery 5 points and reading 10 points below the average", () => {
    // Average: 95 % delivered, 70 % read.
    expect(lowRates(row("t", 100, 90, 54), totals)).toEqual({
      delivery: { rate: 0.9, average: 0.95 },
      read: { rate: 0.6, average: 0.7 },
    });
    expect(lowRates(row("t", 100, 91, 56), totals)).toEqual({ delivery: null, read: null });
  });

  it("does not flag templates with too few sends", () => {
    expect(lowRates(row("t", 99, 50, 10), totals)).toEqual({ delivery: null, read: null });
  });
});

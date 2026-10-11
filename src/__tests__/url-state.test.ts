import { describe, it, expect } from "vitest";
import { DEFAULT_URL_STATE, parseUrlState, serializeUrlState } from "@/lib/url-state";

describe("url state", () => {
  it("serializes defaults to an empty query string", () => {
    expect(serializeUrlState(DEFAULT_URL_STATE)).toBe("");
    expect(parseUrlState("")).toEqual(DEFAULT_URL_STATE);
  });

  it("round-trips every filter", () => {
    const state = {
      search: "curso madrid",
      wabas: ["1", "2"],
      statuses: ["APPROVED"],
      languages: ["es", "pt_PT"],
      categories: ["MARKETING"],
      hideSamples: false,
      view: "list" as const,
      template: "999",
    };

    expect(parseUrlState(serializeUrlState(state))).toEqual(state);
  });

  it("only keeps the selected template in list view", () => {
    const query = serializeUrlState({ ...DEFAULT_URL_STATE, view: "all", template: "999" });
    expect(query).toBe("");
  });

  it("ignores unknown or empty values", () => {
    expect(parseUrlState("?view=grid&waba=,&t=")).toEqual(DEFAULT_URL_STATE);
  });
});

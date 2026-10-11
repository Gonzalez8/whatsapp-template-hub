import { describe, it, expect } from "vitest";
import { DEFAULT_URL_STATE, MAX_COMPARE, parseUrlState, serializeUrlState } from "@/lib/url-state";

describe("url state", () => {
  it("serializes defaults to an empty query string", () => {
    expect(serializeUrlState(DEFAULT_URL_STATE)).toBe("");
    expect(parseUrlState("")).toEqual(DEFAULT_URL_STATE);
  });

  it("round-trips every filter, the selection and the comparison", () => {
    const state = {
      search: "curso madrid",
      wabas: ["1", "2"],
      statuses: ["APPROVED"],
      languages: ["es", "pt_PT"],
      categories: ["MARKETING"],
      hideSamples: false,
      view: "compare" as const,
      template: "999",
      compare: ["999", "1000"],
    };

    expect(parseUrlState(serializeUrlState(state))).toEqual(state);
  });

  it("opens the gallery, also from old links (view=all)", () => {
    expect(parseUrlState("?view=gallery").view).toBe("gallery");
    expect(parseUrlState("?view=all").view).toBe("gallery");
    expect(serializeUrlState({ ...DEFAULT_URL_STATE, view: "gallery" })).toBe("view=gallery");
  });

  it("caps the comparison and ignores empty values", () => {
    expect(parseUrlState("?cmp=1,2,3,4,5,6").compare).toHaveLength(MAX_COMPARE);
    expect(parseUrlState("?view=grid&waba=,&t=&cmp=")).toEqual(DEFAULT_URL_STATE);
  });
});

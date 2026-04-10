import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTemplateFilters } from "@/hooks/useTemplateFilters";
import type { Waba } from "@/types/template";

function makeTemplate(overrides: Partial<Waba["templates"][number]> = {}) {
  return {
    id: overrides.id ?? "t1",
    name: overrides.name ?? "my_template",
    status: overrides.status ?? "APPROVED",
    category: overrides.category ?? "MARKETING",
    language: overrides.language ?? "es",
    components: overrides.components,
  } satisfies Waba["templates"][number];
}

function makeWaba(overrides: Partial<Waba> = {}): Waba {
  return {
    waba_id: overrides.waba_id ?? "w1",
    waba_name: overrides.waba_name ?? "Test WABA",
    phone_numbers: overrides.phone_numbers ?? [],
    templates: overrides.templates ?? [makeTemplate()],
  };
}

const sampleTemplate = makeTemplate({
  id: "s1",
  name: "sample_movie_ticket_confirmation",
});

const realTemplate = makeTemplate({
  id: "r1",
  name: "order_confirmation",
});

const wabas: Waba[] = [
  makeWaba({
    waba_id: "w1",
    templates: [realTemplate, sampleTemplate],
  }),
];

describe("useTemplateFilters", () => {
  describe("hideSamples", () => {
    it("hides sample_ templates by default", () => {
      const { result } = renderHook(() => useTemplateFilters(wabas));

      expect(result.current.hideSamples).toBe(true);
      expect(result.current.totalTemplates).toBe(1);
      expect(result.current.filtered[0].templates).toEqual([realTemplate]);
    });

    it("shows sample_ templates when hideSamples is false", () => {
      const { result } = renderHook(() => useTemplateFilters(wabas));

      act(() => {
        result.current.setHideSamples(false);
      });

      expect(result.current.hideSamples).toBe(false);
      expect(result.current.totalTemplates).toBe(2);
      expect(result.current.filtered[0].templates).toContainEqual(sampleTemplate);
    });

    it("toggles hideSamples back and forth", () => {
      const { result } = renderHook(() => useTemplateFilters(wabas));

      // default: hidden
      expect(result.current.totalTemplates).toBe(1);

      // show
      act(() => result.current.setHideSamples(false));
      expect(result.current.totalTemplates).toBe(2);

      // hide again
      act(() => result.current.setHideSamples(true));
      expect(result.current.totalTemplates).toBe(1);
    });

    it("removes WABA from results when all its templates are samples and hideSamples is true", () => {
      const onlySamples: Waba[] = [
        makeWaba({
          waba_id: "w-samples",
          templates: [makeTemplate({ id: "s1", name: "sample_one" }), makeTemplate({ id: "s2", name: "sample_two" })],
        }),
      ];

      const { result } = renderHook(() => useTemplateFilters(onlySamples));

      expect(result.current.filtered).toHaveLength(0);
      expect(result.current.totalTemplates).toBe(0);
    });

    it("does not filter templates that contain sample_ in the middle of the name", () => {
      const edgeCase: Waba[] = [
        makeWaba({
          templates: [makeTemplate({ id: "e1", name: "my_sample_template" })],
        }),
      ];

      const { result } = renderHook(() => useTemplateFilters(edgeCase));

      expect(result.current.totalTemplates).toBe(1);
    });
  });

  describe("other filters combined with hideSamples", () => {
    it("applies status filter alongside hideSamples", () => {
      const mixed: Waba[] = [
        makeWaba({
          templates: [
            makeTemplate({ id: "a1", name: "real_one", status: "APPROVED" }),
            makeTemplate({ id: "a2", name: "real_two", status: "PENDING" }),
            makeTemplate({ id: "s1", name: "sample_one", status: "APPROVED" }),
          ],
        }),
      ];

      const { result } = renderHook(() => useTemplateFilters(mixed));

      // hideSamples=true (default) + filter to PENDING
      act(() => result.current.toggleStatus("PENDING"));

      expect(result.current.totalTemplates).toBe(1);
      expect(result.current.filtered[0].templates[0].name).toBe("real_two");
    });
  });
});

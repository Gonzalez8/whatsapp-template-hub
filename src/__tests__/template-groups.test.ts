import { describe, it, expect } from "vitest";
import { groupByName, pickVariant } from "@/lib/template-groups";
import type { Template } from "@/types/template";

const tpl = (id: string, name: string, language: string): Template => ({
  id,
  name,
  language,
  status: "APPROVED",
  category: "MARKETING",
});

describe("groupByName", () => {
  it("joins the language variants of a name, keeping the first-appearance order", () => {
    const families = groupByName([
      tpl("1", "entrevista_finde", "pt_PT"),
      tpl("2", "bienvenida", "es"),
      tpl("3", "entrevista_finde", "es"),
      tpl("4", "entrevista_finde", "en"),
    ]);

    expect(families.map((f) => f.name)).toEqual(["entrevista_finde", "bienvenida"]);
    expect(families[0].variants.map((v) => v.language)).toEqual(["en", "es", "pt_PT"]);
  });
});

describe("pickVariant", () => {
  const family = groupByName([tpl("1", "x", "es"), tpl("2", "x", "pt_PT")])[0];

  it("keeps the language being browsed when the family has it", () => {
    expect(pickVariant(family, "pt_PT").id).toBe("2");
  });

  it("falls back to the first variant", () => {
    expect(pickVariant(family, "en").id).toBe("1");
    expect(pickVariant(family).id).toBe("1");
  });
});

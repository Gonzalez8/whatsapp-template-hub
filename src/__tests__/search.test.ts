import { describe, it, expect } from "vitest";
import { buildSearchText, buildSnippet, findMatchRanges, matchesTerms, normalize, parseQuery } from "@/lib/search";
import type { Template } from "@/types/template";

const template: Template = {
  id: "123456",
  name: "confirmacion_matricula",
  status: "APPROVED",
  category: "UTILITY",
  language: "pt_PT",
  components: [
    { type: "HEADER", format: "TEXT", text: "Formação confirmada" },
    { type: "BODY", text: "Olá {{1}}, a sua inscrição no curso foi recebida." },
    { type: "FOOTER", text: "Acme Formação" },
    {
      type: "BUTTONS",
      buttons: [
        { type: "URL", text: "Ver curso", url: "https://cloud.email.acme.example/contacto-gracias{{1}}" },
        { type: "PHONE_NUMBER", text: "Llamar", phone_number: "+34600000000" },
      ],
    },
  ],
};

const search = (query: string, wabaName = "Acme Formação PT") =>
  matchesTerms(buildSearchText(template, wabaName), parseQuery(query));

describe("normalize / parseQuery", () => {
  it("ignores case and accents and treats underscores as spaces", () => {
    expect(normalize("Información_Matrícula ÇÃO")).toBe("informacion matricula cao");
  });

  it("splits the query into terms", () => {
    expect(parseQuery("  Curso   MADRID ")).toEqual(["curso", "madrid"]);
    expect(parseQuery("")).toEqual([]);
  });
});

describe("template search", () => {
  it("matches every part of the content, not only the body", () => {
    expect(search("confirmada")).toBe(true); // header
    expect(search("inscricao")).toBe(true); // body, without accents
    expect(search("acme")).toBe(true); // footer / WABA
    expect(search("ver curso")).toBe(true); // button text
    expect(search("acme.example/contacto")).toBe(true); // button URL
    expect(search("600000000")).toBe(true); // button phone
    expect(search("123456")).toBe(true); // template id
  });

  it("matches the name with spaces instead of underscores", () => {
    expect(search("confirmacion matricula")).toBe(true);
    expect(search("confirmacion_matricula")).toBe(true);
  });

  it("requires every term, in any order", () => {
    expect(search("curso olá")).toBe(true);
    expect(search("curso inexistente")).toBe(false);
  });

  it("matches everything with an empty query", () => {
    expect(search("")).toBe(true);
  });
});

describe("findMatchRanges", () => {
  it("returns ranges in the original text, even with accents", () => {
    const text = "La Formação começa";
    const [range] = findMatchRanges(text, parseQuery("formacao"));
    expect(text.slice(...range)).toBe("Formação");
  });

  it("keeps original indices around emoji", () => {
    const text = "Hola 👋 curso";
    const [range] = findMatchRanges(text, ["curso"]);
    expect(text.slice(...range)).toBe("curso");
  });

  it("merges overlapping matches of different terms", () => {
    expect(findMatchRanges("matricula", ["matri", "tricula"])).toEqual([[0, 9]]);
  });
});

describe("buildSnippet", () => {
  it("returns an excerpt around the first match with highlight ranges", () => {
    const long = `${"x ".repeat(50)}palabra clave\nen medio ${"y ".repeat(50)}`;
    const snippet = buildSnippet(long, ["clave"])!;

    expect(snippet.text.startsWith("…")).toBe(true);
    expect(snippet.text.endsWith("…")).toBe(true);
    expect(snippet.text).not.toContain("\n");
    expect(snippet.text.slice(...snippet.ranges[0])).toBe("clave");
  });

  it("returns null when nothing matches", () => {
    expect(buildSnippet("hola", ["adios"])).toBeNull();
  });
});

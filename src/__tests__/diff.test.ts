import { describe, it, expect } from "vitest";
import { diffTexts } from "@/lib/diff";

const changed = (segments: { text: string; changed: boolean }[]) =>
  segments
    .filter((s) => s.changed)
    .map((s) => s.text.trim())
    .filter(Boolean);

describe("diffTexts", () => {
  it("marks only the words that differ, as whole phrases", () => {
    const [a, b] = diffTexts([
      "Hola {{1}}, este fin de semana no hay equipo. Reserva abajo.",
      "Hola {{1}}, el lunes te llamaremos. Reserva abajo.",
    ]);

    expect(changed(a)).toEqual(["este fin de semana no hay equipo."]);
    expect(changed(b)).toEqual(["el lunes te llamaremos."]);
  });

  it("joins the segments back into the original text", () => {
    const texts = ["uno dos\n\ntres", "uno cuatro\n\ntres"];
    diffTexts(texts).forEach((segments, i) => {
      expect(segments.map((s) => s.text).join("")).toBe(texts[i]);
    });
  });

  it("with three texts, marks a word unless every other text shares it", () => {
    const [a, b, c] = diffTexts(["hola curso A", "hola curso B", "hola oposición A"]);

    expect(changed(a)).toEqual(["curso A"]);
    expect(changed(b)).toEqual(["curso B"]);
    expect(changed(c)).toEqual(["oposición A"]);
  });

  it("marks nothing for identical texts or a single text", () => {
    expect(
      diffTexts(["igual", "igual"])
        .flat()
        .some((s) => s.changed),
    ).toBe(false);
    expect(diffTexts(["solo"])[0]).toEqual([{ text: "solo", changed: false }]);
  });
});

import { describe, it, expect } from "vitest";
import { getExampleValues, hasExamples, replaceVariables } from "@/lib/template-utils";
import type { Template, TemplateComponent } from "@/types/template";

const namedBody: TemplateComponent = {
  type: "BODY",
  text: "Hola {{lead_name}}, completa el test: https://humains.es/admision?t={{user_id}}",
  example: {
    body_text_named_params: [
      { param_name: "lead_name", example: "Jose Manuel" },
      { param_name: "user_id", example: "abc-123" },
    ],
  },
};

const positionalBody: TemplateComponent = {
  type: "BODY",
  text: "Hola {{1}}, tu cita es el {{2}}",
  example: { body_text: [["Ana", "lunes"]] },
};

const asTemplate = (components: TemplateComponent[]): Template => ({
  id: "1",
  name: "t",
  status: "APPROVED",
  category: "UTILITY",
  language: "es",
  components,
});

describe("example values", () => {
  it("reads NAMED examples (body_text_named_params)", () => {
    const text = replaceVariables(namedBody.text!, getExampleValues(namedBody));
    expect(text).toBe("Hola Jose Manuel, completa el test: https://humains.es/admision?t=abc-123");
  });

  it("reads POSITIONAL examples (body_text)", () => {
    expect(replaceVariables(positionalBody.text!, getExampleValues(positionalBody))).toBe(
      "Hola Ana, tu cita es el lunes",
    );
  });

  it("reads NAMED header examples", () => {
    const header: TemplateComponent = {
      type: "HEADER",
      format: "TEXT",
      text: "Hola {{name}}",
      example: { header_text_named_params: [{ param_name: "name", example: "Ana" }] },
    };
    expect(replaceVariables(header.text!, getExampleValues(header))).toBe("Hola Ana");
  });

  it("leaves variables without an example untouched", () => {
    expect(replaceVariables("{{1}} y {{2}}", ["solo uno"])).toBe("solo uno y {{2}}");
    expect(replaceVariables("{{a}}", undefined)).toBe("{{a}}");
  });

  it("resolves named variables with positional examples by order", () => {
    expect(replaceVariables("{{nombre}} - {{curso}}", ["Ana", "Inglés"])).toBe("Ana - Inglés");
  });
});

describe("hasExamples", () => {
  it("is true for NAMED and POSITIONAL templates with examples", () => {
    expect(hasExamples(asTemplate([namedBody]))).toBe(true);
    expect(hasExamples(asTemplate([positionalBody]))).toBe(true);
  });

  it("is false without variables or without examples", () => {
    expect(hasExamples(asTemplate([{ type: "BODY", text: "Sin variables" }]))).toBe(false);
    expect(hasExamples(asTemplate([{ type: "BODY", text: "Hola {{1}}" }]))).toBe(false);
  });
});

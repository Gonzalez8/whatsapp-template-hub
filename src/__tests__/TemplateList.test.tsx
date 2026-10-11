import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TemplateList } from "@/components/TemplateList";
import type { Template, Waba } from "@/types/template";

const tpl = (id: string, name: string, language = "es"): Template => ({
  id,
  name,
  language,
  status: "APPROVED",
  category: "UTILITY",
});

const waba = (id: string, templates: Template[]): Waba => ({
  waba_id: id,
  waba_name: `WABA ${id}`,
  phone_numbers: [],
  templates,
});

const wabas = [
  waba("a", [tpl("a1", "plantilla_a"), tpl("a2", "plantilla_a", "pt_PT")]),
  waba("b", [tpl("b1", "plantilla_b")]),
];

const renderList = (openAllKey = "") => (
  <TemplateList
    wabas={wabas}
    selectedId={null}
    onSelect={() => {}}
    compareIds={new Set()}
    compareFull={false}
    onToggleCompare={() => {}}
    openAllKey={openAllKey}
  />
);

const rows = () => screen.queryAllByRole("button", { name: /^plantilla_/ });

describe("TemplateList", () => {
  it("opens only the first group, with one row per name and a tag per language", () => {
    render(renderList());

    expect(rows().map((r) => r.textContent)).toEqual([expect.stringContaining("plantilla_a")]);
    expect(screen.getByRole("button", { name: "es" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "pt_PT" })).toBeInTheDocument();
  });

  it("opens every group when a search or WABA selection starts, but lets the user collapse them", () => {
    const { rerender } = render(renderList());
    rerender(renderList("plantilla"));
    expect(rows()).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: /WABA b/ }));
    expect(rows()).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Expandir todos" }));
    expect(rows()).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Contraer todos" }));
    expect(rows()).toHaveLength(0);
  });

  it("opens every group when mounted with an active filter", () => {
    render(renderList("plantilla"));
    expect(rows()).toHaveLength(2);
  });

  it("re-opens every group when the filter changes", () => {
    const { rerender } = render(renderList("plantilla"));
    fireEvent.click(screen.getByRole("button", { name: "Contraer todos" }));

    rerender(renderList("plantilla|a,b"));

    expect(rows()).toHaveLength(2);
  });
});

import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SearchTermsProvider } from "@/components/Highlight";
import { TemplateList } from "@/components/TemplateList";
import { parseQuery } from "@/lib/search";
import type { Waba } from "@/types/template";

const waba = (id: string, templateName: string): Waba => ({
  waba_id: id,
  waba_name: `WABA ${id}`,
  phone_numbers: [],
  templates: [{ id: `t-${id}`, name: templateName, status: "APPROVED", category: "UTILITY", language: "es" }],
});

const wabas = [waba("a", "plantilla_a"), waba("b", "plantilla_b")];

const renderList = (query: string) => (
  <SearchTermsProvider value={parseQuery(query)}>
    <TemplateList wabas={wabas} selectedId={null} onSelect={() => {}} />
  </SearchTermsProvider>
);

describe("TemplateList", () => {
  it("opens only the first group without a search", () => {
    render(renderList(""));

    expect(screen.getByText("plantilla_a")).toBeInTheDocument();
    expect(screen.queryByText("plantilla_b")).toBeNull();
  });

  it("opens every group when a search starts, but lets the user collapse them", () => {
    const { rerender } = render(renderList(""));
    rerender(renderList("plantilla"));

    expect(screen.getAllByRole("button", { name: /plantilla/ })).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: /WABA b/ }));
    expect(screen.getAllByRole("button", { name: /plantilla/ })).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Expandir todos" }));
    expect(screen.getAllByRole("button", { name: /plantilla/ })).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Contraer todos" }));
    expect(screen.queryAllByRole("button", { name: /plantilla/ })).toHaveLength(0);
  });

  it("opens every group when mounted with an active search", () => {
    render(renderList("plantilla"));

    expect(screen.getAllByRole("button", { name: /plantilla/ })).toHaveLength(2);
  });

  it("re-opens every group when the search changes", () => {
    const { rerender } = render(renderList("plantilla"));
    fireEvent.click(screen.getByRole("button", { name: "Contraer todos" }));

    rerender(renderList("plantilla b"));

    expect(screen.getAllByRole("button", { name: /plantilla/ })).toHaveLength(2);
  });
});

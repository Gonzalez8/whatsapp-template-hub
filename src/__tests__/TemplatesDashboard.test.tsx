import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { Template, Waba } from "@/types/template";

vi.mock("@/app/actions", () => ({ syncTemplates: vi.fn() }));

const { TemplatesDashboard } = await import("@/components/TemplatesDashboard");

const tpl = (id: string, name: string, language: string, body: string): Template => ({
  id,
  name,
  language,
  status: "APPROVED",
  category: "MARKETING",
  components: [{ type: "BODY", text: body }],
});

const wabas: Waba[] = [
  {
    waba_id: "campus",
    waba_name: "Campus Training",
    phone_numbers: [],
    templates: [
      tpl("c1", "entrevista_finde", "es", "Este fin de semana no hay equipo."),
      tpl("c2", "entrevista_finde", "pt_PT", "Este fim de semana não há equipa."),
      tpl("c3", "entrevista_semana", "es", "El lunes te llamamos."),
    ],
  },
  {
    waba_id: "flou",
    waba_name: "Flou MKT",
    phone_numbers: [],
    templates: [tpl("f1", "temario", "es", "Descarga el temario.")],
  },
];

const renderDashboard = () => render(<TemplatesDashboard wabas={wabas} fetchedAt={Date.now() - 10 * 60_000} />);
const sidebar = () => screen.getByRole("complementary", { name: "Filtrar por WABA" });

describe("TemplatesDashboard", () => {
  beforeEach(() => window.history.replaceState(null, "", "/"));

  it("filters by WABA from the sidebar and keeps it in the URL", async () => {
    renderDashboard();

    fireEvent.click(within(sidebar()).getByRole("checkbox", { name: /Flou MKT/ }));

    expect(screen.queryByRole("button", { name: /^entrevista_finde/ })).toBeNull();
    expect(screen.getByRole("button", { name: /^temario/ })).toBeInTheDocument();
    expect(window.location.search).toBe("?waba=flou");
  });

  it("opens a template, switches language and compares two templates", async () => {
    renderDashboard();

    fireEvent.click(screen.getByRole("button", { name: /^entrevista_finde/ }));
    expect(screen.getByRole("heading", { level: 1, name: "entrevista_finde" })).toBeInTheDocument();

    fireEvent.click(within(screen.getByRole("group", { name: "Idioma" })).getByRole("button", { name: "pt_PT" }));
    expect(screen.getAllByText(/fim de semana/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("checkbox", { name: "Comparar entrevista_finde" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Comparar entrevista_semana" }));
    expect(screen.getByText("2 plantillas para comparar")).toBeInTheDocument();

    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Comparar →" })));

    expect(screen.getAllByRole("article")).toHaveLength(2);
    expect(window.location.search).toContain("view=compare");
    expect(window.location.search).toContain("cmp=c2%2Cc3");
  });

  it("restores the comparison from a shared link", () => {
    window.history.replaceState(null, "", "/?view=compare&cmp=c1,f1");
    renderDashboard();

    const columns = screen.getAllByRole("article");
    expect(columns.map((c) => within(c).getByRole("heading").textContent)).toEqual(["entrevista_finde", "temario"]);
  });
});

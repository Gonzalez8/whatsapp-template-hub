import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { CompareView } from "@/components/CompareView";
import { WabaSidebar } from "@/components/WabaSidebar";
import type { Template, Waba } from "@/types/template";

const tpl = (id: string, name: string, body: string, extra: Partial<Template> = {}): Template => ({
  id,
  name,
  language: "es",
  status: "APPROVED",
  category: "MARKETING",
  components: [
    { type: "BODY", text: body },
    { type: "BUTTONS", buttons: [{ type: "URL", text: "Agendar", url: `https://x.es/${id}` }] },
  ],
  ...extra,
});

describe("CompareView", () => {
  const items = [
    {
      template: tpl("1", "entrevista_finde", "Hola, este fin de semana no hay equipo. Reserva abajo."),
      wabaName: "Acme",
    },
    { template: tpl("2", "entrevista_semana", "Hola, el lunes te llamamos. Reserva abajo."), wabaName: "Acme" },
  ];

  it("starts without highlighting", () => {
    const { container } = render(
      <CompareView items={items} onRemove={() => {}} onClear={() => {}} onBack={() => {}} />,
    );

    expect(screen.getAllByRole("article")).toHaveLength(2);
    expect(screen.getByRole("checkbox", { name: "Resaltar diferencias" })).not.toBeChecked();
    expect(container.querySelector("mark")).toBeNull();
  });

  it("highlights what differs when turned on", () => {
    const { container } = render(
      <CompareView items={items} onRemove={() => {}} onClear={() => {}} onBack={() => {}} />,
    );

    fireEvent.click(screen.getByRole("checkbox", { name: "Resaltar diferencias" }));

    const marked = Array.from(container.querySelectorAll("mark")).map((m) => m.textContent?.trim());
    expect(marked).toEqual(["este fin de semana no hay equipo.", "el lunes te llamamos."]);
    // Same category in both: not highlighted. Different button URL: highlighted.
    const [first] = screen.getAllByRole("article");
    expect(within(first).getByText("Marketing")).not.toHaveClass("bg-amber-200/60");
    expect(within(first).getByText(/https:\/\/x\.es\/1/)).toHaveClass("bg-amber-200/60");
  });

  it("removes a template and goes back to the list", () => {
    const onRemove = vi.fn();
    const onBack = vi.fn();
    render(<CompareView items={items} onRemove={onRemove} onClear={() => {}} onBack={onBack} />);

    fireEvent.click(screen.getByRole("button", { name: "Quitar entrevista_semana de la comparación" }));
    fireEvent.click(screen.getByRole("button", { name: "Volver a la lista" }));

    expect(onRemove).toHaveBeenCalledWith("2");
    expect(onBack).toHaveBeenCalled();
  });

  it("asks for a second template when there is only one", () => {
    render(<CompareView items={items.slice(0, 1)} onRemove={() => {}} onClear={() => {}} onBack={() => {}} />);
    expect(screen.getByText("Añade al menos dos plantillas")).toBeInTheDocument();
  });
});

describe("WabaSidebar", () => {
  const tplA = tpl("a", "a", "a");
  const wabas: Waba[] = [
    {
      waba_id: "1",
      waba_name: "Treintaycinco mm",
      phone_numbers: [{ id: "p1", display_phone_number: "+1 555-947-2241", verified_name: "x" }],
      templates: [tplA],
    },
    {
      waba_id: "2",
      waba_name: "Treintaycinco mm",
      phone_numbers: [{ id: "p2", display_phone_number: "+1 555-950-4924", verified_name: "x" }],
      templates: [tplA],
    },
    { waba_id: "3", waba_name: "Acme Escuela", phone_numbers: [], templates: [], error: "Invalid WABA (HTTP 400)" },
  ];
  const counts = new Map([
    ["1", 5],
    ["2", 1],
    ["3", 0],
  ]);

  it("hides WABAs without templates unless they failed to load", () => {
    const empty: Waba = { waba_id: "4", waba_name: "Vacía", phone_numbers: [], templates: [] };
    render(
      <WabaSidebar
        wabas={[...wabas, empty]}
        counts={counts}
        selected={new Set()}
        onToggle={() => {}}
        onOnly={() => {}}
        onClear={() => {}}
      />,
    );

    expect(screen.queryByText("Vacía")).toBeNull();
    expect(screen.getByText("Todas (3)")).toBeInTheDocument();
  });

  it("lists WABAs alphabetically with the phone that tells duplicates apart", () => {
    render(
      <WabaSidebar
        wabas={wabas}
        counts={counts}
        selected={new Set()}
        onToggle={() => {}}
        onOnly={() => {}}
        onClear={() => {}}
      />,
    );

    const names = screen.getAllByRole("checkbox").map((c) => c.closest("label")?.textContent);
    expect(names[0]).toContain("Acme Escuela");
    expect(screen.getByText("+1 555-947-2241")).toBeInTheDocument();
    expect(screen.getByText("+1 555-950-4924")).toBeInTheDocument();
    expect(screen.getByText("Error al cargar")).toHaveAttribute("title", "Invalid WABA (HTTP 400)");
  });

  it("toggles, selects only one and filters by name or phone", () => {
    const onToggle = vi.fn();
    const onOnly = vi.fn();
    render(
      <WabaSidebar
        wabas={wabas}
        counts={counts}
        selected={new Set(["1"])}
        onToggle={onToggle}
        onOnly={onOnly}
        onClear={() => {}}
      />,
    );

    expect(screen.getByText("1 de 3")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("checkbox")[1]);
    fireEvent.click(screen.getByRole("button", { name: "Mostrar solo Acme Escuela" }));
    expect(onToggle).toHaveBeenCalled();
    expect(onOnly).toHaveBeenCalledWith("3");

    fireEvent.change(screen.getByRole("searchbox", { name: "Filtrar WABAs" }), { target: { value: "950" } });
    expect(screen.getAllByRole("checkbox")).toHaveLength(1);
  });
});

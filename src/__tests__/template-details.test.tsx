import { describe, it, expect, vi, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { WhatsAppPreview } from "@/components/WhatsAppPreview";
import { ButtonsTab, InfoTab, VariablesTab } from "@/components/TemplateDetails";
import { TemplateBadges } from "@/components/TemplateBadges";
import type { Template, TemplateComponent } from "@/types/template";

const header = (format: string, url?: string): TemplateComponent => ({
  type: "HEADER",
  format,
  example: url ? { header_handle: [url] } : undefined,
});

const body: TemplateComponent = { type: "BODY", text: "Hola {{1}}", example: { body_text: [["Ana"]] } };

const template: Template = {
  id: "987",
  name: "checkout_url",
  status: "APPROVED",
  category: "MARKETING",
  previous_category: "UTILITY",
  parameter_format: "POSITIONAL",
  language: "es",
  components: [
    header("IMAGE", "https://scontent.whatsapp.net/img.png"),
    body,
    {
      type: "BUTTONS",
      buttons: [
        { type: "URL", text: "Pagar", url: "https://pay.example.com/{{1}}", example: ["https://pay.example.com/abc"] },
        { type: "FLOW", text: "Concierta una cita", flow_id: 1504377164791677, navigate_screen: "APPOINTMENT" },
      ],
    },
  ],
};

describe("media headers", () => {
  it("shows the example image lazily and falls back to a placeholder if it fails", () => {
    render(
      <WhatsAppPreview components={[header("IMAGE", "https://scontent.whatsapp.net/img.png"), body]} mode="template" />,
    );
    const img = screen.getByRole("img", { name: /imagen de ejemplo/i });

    expect(img).toHaveAttribute("loading", "lazy");
    fireEvent.error(img);
    expect(screen.queryByRole("img", { name: /imagen de ejemplo/i })).toBeNull();
    expect(screen.getByText("Imagen")).toBeInTheDocument();
  });

  it("does not download example videos until they are played", () => {
    const { container } = render(
      <WhatsAppPreview components={[header("VIDEO", "https://scontent.whatsapp.net/v.mp4"), body]} mode="template" />,
    );
    expect(container.querySelector("video")).toHaveAttribute("preload", "none");
  });

  it("renders documents, locations and missing media without breaking", () => {
    render(<WhatsAppPreview components={[header("DOCUMENT", "https://x/doc.pdf")]} mode="template" />);
    expect(screen.getByRole("link", { name: "Abrir ejemplo" })).toHaveAttribute("href", "https://x/doc.pdf");

    render(<WhatsAppPreview components={[header("LOCATION")]} mode="template" />);
    expect(screen.getByText(/Ubicación/)).toBeInTheDocument();

    render(<WhatsAppPreview components={[header("IMAGE")]} mode="template" />);
    expect(screen.getByText("Imagen")).toBeInTheDocument();
  });
});

describe("detail tabs", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("lists variables with their examples", () => {
    render(<VariablesTab template={template} />);

    expect(screen.getAllByRole("row")).toHaveLength(3); // header + 2 variables
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("https://pay.example.com/abc")).toBeInTheDocument();
  });

  it("lists button targets, including Flow screens", () => {
    render(<ButtonsTab template={template} />);

    expect(screen.getByText("https://pay.example.com/{{1}}")).toBeInTheDocument();
    expect(screen.getByText(/pantalla APPOINTMENT/)).toBeInTheDocument();
  });

  it("shows metadata and the recategorization", () => {
    render(<InfoTab template={template} wabaName="Acme Marketing" />);

    expect(screen.getByText("Acme Marketing")).toBeInTheDocument();
    expect(screen.getByText(/cambiada por Meta/)).toBeInTheDocument();
  });

  it("says so when there is nothing to list", () => {
    const plain = { ...template, components: [{ type: "BODY" as const, text: "Hola" }] };
    render(<VariablesTab template={plain} />);
    render(<ButtonsTab template={plain} />);

    expect(screen.getByText("Esta plantilla no tiene variables.")).toBeInTheDocument();
    expect(screen.getByText("Esta plantilla no tiene botones.")).toBeInTheDocument();
  });

  it("copies the template id to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    render(<InfoTab template={template} wabaName="Acme Marketing" />);

    fireEvent.click(screen.getByRole("button", { name: "Copiar ID" }));

    expect(writeText).toHaveBeenCalledWith("987");
    expect(await screen.findByText("¡Copiado!")).toBeInTheDocument();
  });

  it("tells the user when the clipboard is not available", async () => {
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
    render(<InfoTab template={template} wabaName="Acme Marketing" />);

    fireEvent.click(screen.getByRole("button", { name: "Copiar ID" }));

    expect(await screen.findByText("No se pudo copiar")).toBeInTheDocument();
  });
});

describe("TemplateBadges", () => {
  it("warns when Meta changed the category", () => {
    render(<TemplateBadges template={template} />);
    expect(screen.getByText("Antes Utilidad")).toHaveAttribute("title", expect.stringContaining("coste"));
  });
});

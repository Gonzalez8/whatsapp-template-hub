import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { SearchTermsProvider } from "@/components/Highlight";
import { TemplateListItem } from "@/components/TemplateListItem";
import { WhatsAppPreview } from "@/components/WhatsAppPreview";
import { parseQuery } from "@/lib/search";
import type { Template, TemplateComponent } from "@/types/template";

const withSearch = (query: string, ui: ReactNode) =>
  render(<SearchTermsProvider value={parseQuery(query)}>{ui}</SearchTermsProvider>);

const marks = (container: HTMLElement) => Array.from(container.querySelectorAll("mark")).map((m) => m.textContent);

const components: TemplateComponent[] = [
  {
    type: "BODY",
    text: "Hola {{lead_name}}, *tu matrícula* está confirmada.",
    example: { body_text_named_params: [{ param_name: "lead_name", example: "Jose Manuel" }] },
  },
  {
    type: "BUTTONS",
    buttons: [{ type: "URL", text: "Ver curso", url: "https://oposicionesflou.com/contacto-gracias" }],
  },
];

const template: Template = {
  id: "1",
  name: "confirmacion_matricula",
  status: "APPROVED",
  category: "UTILITY",
  language: "es",
  components,
};

describe("TemplateListItem", () => {
  it("highlights the name and shows where the content matched", () => {
    const { container } = withSearch(
      "matricula",
      <TemplateListItem template={template} selected={false} onSelect={() => {}} />,
    );

    expect(marks(container)).toEqual(["matricula", "matrícula"]);
  });

  it("shows no snippet without a search", () => {
    const { container } = withSearch("", <TemplateListItem template={template} selected={false} onSelect={() => {}} />);

    expect(container).toHaveTextContent(/^confirmacion_matricula/);
    expect(container.querySelector("mark")).toBeNull();
  });
});

describe("WhatsAppPreview", () => {
  it("highlights matches inside WhatsApp formatting", () => {
    const { container } = withSearch("matricula", <WhatsAppPreview components={components} mode="template" />);

    expect(container.querySelector("strong mark")).toHaveTextContent("matrícula");
  });

  it("reveals a button URL only when the search matched it", () => {
    const url = "https://oposicionesflou.com/contacto-gracias";

    const before = withSearch("", <WhatsAppPreview components={components} mode="template" />);
    expect(before.container).not.toHaveTextContent(url);
    before.unmount();

    const after = withSearch("contacto", <WhatsAppPreview components={components} mode="template" />);
    expect(after.container).toHaveTextContent(url);
    expect(marks(after.container)).toEqual(["contacto"]);
  });

  it("fills NAMED variables in example mode", () => {
    withSearch("", <WhatsAppPreview components={components} mode="example" />);

    expect(screen.getByText(/Hola Jose Manuel/)).toBeInTheDocument();
  });
});

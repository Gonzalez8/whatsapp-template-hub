import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AnalyticsView } from "@/components/analytics/AnalyticsView";
import { TemplateAnalyticsTab } from "@/components/analytics/TemplateAnalyticsTab";
import { BarChart, sendPoints } from "@/components/analytics/shared";
import { clearAnalyticsCache } from "@/hooks/useAnalytics";
import type { SummaryAnalytics, TemplateAnalytics } from "@/lib/analytics/types";
import type { Template, Waba } from "@/types/template";

const template: Template = {
  id: "t1",
  name: "campus_confirmation",
  status: "APPROVED",
  category: "UTILITY",
  language: "es_ES",
  components: [{ type: "BODY", text: "Hola" }],
};

const waba: Waba = {
  waba_id: "111",
  waba_name: "Campus MKT",
  phone_numbers: [{ id: "p", display_phone_number: "+34 900 000 000", verified_name: "Campus" }],
  templates: [template],
};

const counts = (sent: number, delivered: number, read: number, failed = 0, avoidable = 0) => ({
  sent,
  delivered,
  read,
  failed,
  avoidable,
});

const summary: SummaryAnalytics = {
  range: "30d",
  totals: counts(100, 90, 45, 10, 2),
  daily: [{ day: "2026-10-01", sent: 100 }],
  templates: [
    { waba: "111", template: "campus_confirmation", language: "es_es", ...counts(80, 72, 36, 8, 2) },
    { waba: "111", template: "old_template", language: "es", ...counts(20, 18, 9, 2) },
  ],
  errors: [
    { code: "WA-132000", failed: 2, avoidable: true, label: "El número de parámetros no coincide con la plantilla" },
    { code: "131026", failed: 8, avoidable: false, label: "Número sin WhatsApp o no alcanzable" },
  ],
  meta: { total: 500, paid: 300, free: 200, byCategory: { MARKETING: 300, SERVICE: 200 } },
};

function mockFetch(handler: (url: string) => Response) {
  const fetchMock = vi.fn(async (input: string | URL | Request) => handler(input.toString()));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => clearAnalyticsCache());
afterEach(() => vi.unstubAllGlobals());

describe("AnalyticsView", () => {
  it("shows KPIs, Meta volume, the ranking and failures for the selected WABA", async () => {
    const fetchMock = mockFetch(() => Response.json(summary));
    const onOpenTemplate = vi.fn();
    render(
      <AnalyticsView
        wabas={[waba]}
        selectedWabas={new Set(["111"])}
        range="30d"
        onRangeChange={() => {}}
        onOpenTemplate={onOpenTemplate}
      />,
    );

    expect(await screen.findByText("90 mensajes")).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toContain("/api/analytics/summary?waba=111&range=30d");
    expect(screen.getByRole("heading", { name: "Campus MKT" })).toBeInTheDocument();
    expect(screen.getByText("2 evitables · 8 ruido")).toBeInTheDocument();
    expect(screen.getByText("De pago 300 · Gratis 200")).toBeInTheDocument();
    expect(screen.getByText("Evitable")).toBeInTheDocument();

    // Templates still in Meta open the detail; deleted ones are plain text.
    fireEvent.click(screen.getByRole("button", { name: "campus_confirmation" }));
    expect(onOpenTemplate).toHaveBeenCalledWith(template);
    expect(screen.queryByRole("button", { name: "old_template" })).toBeNull();
    expect(screen.getByText("old_template")).toBeInTheDocument();
  });

  it("changes the range and shows API errors", async () => {
    mockFetch(() => Response.json({ error: "La consulta a Data Cloud falló (HTTP 500)" }, { status: 502 }));
    const onRangeChange = vi.fn();
    render(
      <AnalyticsView
        wabas={[waba]}
        selectedWabas={new Set()}
        range="30d"
        onRangeChange={onRangeChange}
        onOpenTemplate={() => {}}
      />,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("HTTP 500");
    expect(screen.getByRole("heading", { name: "Todas las WABAs" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "7 días" }));
    expect(onRangeChange).toHaveBeenCalledWith("7d");
  });
});

describe("TemplateAnalyticsTab", () => {
  const data: TemplateAnalytics = {
    range: "all",
    totals: counts(69, 69, 55),
    daily: [{ day: "2026-05-26", ...counts(69, 69, 55) }],
    errors: [],
    waba: counts(1000, 900, 600),
  };

  it("loads the whole history and compares with the WABA", async () => {
    const fetchMock = mockFetch(() => Response.json(data));
    render(<TemplateAnalyticsTab template={template} wabaId="111" />);

    expect(await screen.findByText("55 de las entregadas")).toBeInTheDocument();
    expect(screen.getAllByText("79,7 %")).toHaveLength(2);
    expect(fetchMock.mock.calls[0][0]).toContain("waba=111&name=campus_confirmation&lang=es_ES&range=all");
    expect(screen.getByText("sin incidencias")).toBeInTheDocument();
    expect(screen.getByText("Envíos por semana")).toBeInTheDocument();
    expect(screen.getByText(/13,0 puntos por encima de la media/)).toBeInTheDocument();
    expect(screen.getByText("Ningún fallo en el periodo.")).toBeInTheDocument();
  });

  it("refetches for another range and explains when there are no sends", async () => {
    const fetchMock = mockFetch(() =>
      Response.json({ ...data, range: "30d", totals: counts(0, 0, 0), daily: [], waba: counts(0, 0, 0) }),
    );
    render(<TemplateAnalyticsTab template={template} wabaId="111" />);
    await screen.findByText(/en el histórico/);

    fireEvent.click(screen.getByRole("button", { name: "30 días" }));
    await waitFor(() => expect(screen.getByText(/en los últimos 30 días/)).toBeInTheDocument());
    expect(fetchMock.mock.calls.at(-1)?.[0]).toContain("range=30d");
  });
});

describe("BarChart", () => {
  it("shows the exact date and value on hover and with the arrow keys", () => {
    const points = sendPoints(
      [
        { day: "2026-10-05", value: 3 },
        { day: "2026-10-06", value: 1 },
        { day: "2026-10-07", value: 12 },
      ],
      false,
    );
    render(<BarChart points={points} label="Envíos" />);
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByText("12")).toBeInTheDocument(); // value axis

    fireEvent.mouseEnter(screen.getAllByTestId("chart-bar")[2]);
    expect(screen.getByRole("status")).toHaveTextContent("mié, 7 oct: 12 envíos");

    const chart = screen.getByRole("group", { name: /Envíos/ });
    fireEvent.keyDown(chart, { key: "ArrowLeft" });
    expect(screen.getByRole("status")).toHaveTextContent("mar, 6 oct: 1 envío");
    fireEvent.keyDown(chart, { key: "Escape" });
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("labels weekly points as weeks", () => {
    expect(sendPoints([{ day: "2026-10-05", value: 1500 }], true)[0].title).toBe("Semana del 5 oct: 1500 envíos");
  });
});

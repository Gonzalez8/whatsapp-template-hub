import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AnalyticsView } from "@/components/analytics/AnalyticsView";
import { TemplateAnalyticsTab } from "@/components/analytics/TemplateAnalyticsTab";
import { BarChart, formatDuration, sendPoints } from "@/components/analytics/shared";
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

const unused: Template = { ...template, id: "t2", name: "never_sent", language: "es" };

const waba: Waba = {
  waba_id: "111",
  waba_name: "Campus MKT",
  phone_numbers: [{ id: "p", display_phone_number: "+34 900 000 000", verified_name: "Campus" }],
  templates: [template, unused, { ...template, id: "t3", name: "paused_one", status: "PAUSED" }],
};

const counts = (sent: number, delivered: number, read: number, failed = 0, avoidable = 0, readMedian = 120) => ({
  sent,
  delivered,
  read,
  failed,
  avoidable,
  readMedian,
});

const summary: SummaryAnalytics = {
  range: "30d",
  origin: "all",
  period: null,
  generatedAt: Date.now() - 12 * 60_000,
  totals: counts(100, 90, 45, 10, 2, 300),
  origins: [
    { origin: "MARKETING_CLOUD_ENGAGEMENT", ...counts(70, 60, 30) },
    { origin: "DIGITAL_ENGAGEMENT", ...counts(30, 30, 15) },
  ],
  daily: [
    { day: "2026-10-01", sent: 60 },
    { day: "2026-10-02", sent: 40 },
  ],
  templates: [
    { waba: "111", template: "campus_confirmation", language: "es_es", ...counts(80, 72, 36, 8, 2, 4000) },
    { waba: "111", template: "old_template", language: "es", ...counts(20, 18, 9, 2) },
  ],
  errors: [
    { code: "WA-132000", failed: 2, avoidable: true, label: "El número de parámetros no coincide con la plantilla" },
    { code: "131026", failed: 8, avoidable: false, label: "Número sin WhatsApp o no alcanzable" },
  ],
  wabaOrigins: [
    { waba: "111", origin: "MARKETING_CLOUD_ENGAGEMENT", sent: 70, delivered: 60 },
    { waba: "111", origin: "DIGITAL_ENGAGEMENT", sent: 30, delivered: 30 },
  ],
  meta: {
    total: 500,
    paid: 300,
    free: 200,
    byCategory: { MARKETING: 300, SERVICE: 200 },
    byWaba: { "111": { templates: 120, service: 150 }, "222": { templates: 180, service: 50 } },
  },
};

const otherWaba: Waba = { ...waba, waba_id: "222", waba_name: "DFO Escuela", templates: [] };

function mockFetch(handler: (url: string) => Response) {
  const fetchMock = vi.fn(async (input: string | URL | Request) => handler(input.toString()));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderView(props: Partial<React.ComponentProps<typeof AnalyticsView>> = {}) {
  const handlers = {
    onRangeChange: vi.fn(),
    onOriginChange: vi.fn(),
    onDayChange: vi.fn(),
    onOpenTemplate: vi.fn(),
  };
  render(
    <AnalyticsView
      wabas={[waba]}
      selectedWabas={new Set(["111"])}
      range="30d"
      origin="all"
      day={null}
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

beforeEach(() => clearAnalyticsCache());
afterEach(() => vi.unstubAllGlobals());

describe("AnalyticsView", () => {
  it("shows KPIs, Meta volume, the ranking and failures for the selected WABA", async () => {
    const fetchMock = mockFetch(() => Response.json(summary));
    const { onOpenTemplate } = renderView();

    expect(await screen.findByText("90 mensajes")).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toContain("/api/analytics/summary?waba=111&range=30d");
    expect(screen.getByRole("heading", { name: "Campus MKT" })).toBeInTheDocument();
    expect(screen.getByText("2 evitables · 8 ruido")).toBeInTheDocument();
    expect(screen.getByText("5 min")).toBeInTheDocument(); // read-time median KPI
    expect(screen.getByText("1 h 7 min")).toBeInTheDocument(); // per-template median
    expect(screen.getAllByRole("button", { name: "Qué es Servicio" })[0]).toHaveAccessibleDescription(
      /Respuestas libres a un cliente/,
    );
    expect(screen.getByRole("button", { name: "Qué es Marketing" })).toHaveAccessibleDescription(
      /Plantillas promocionales/,
    );
    expect(screen.getByText(/estas, hace 12 min/)).toBeInTheDocument();
    expect(screen.getByText("Evitable")).toBeInTheDocument();

    // Templates still in Meta open the detail; deleted ones are plain text.
    fireEvent.click(screen.getByRole("button", { name: "campus_confirmation" }));
    expect(onOpenTemplate).toHaveBeenCalledWith(template);
    expect(screen.queryByRole("button", { name: "old_template" })).toBeNull();
  });

  it("sets Meta's count against what Salesforce delivered, per WABA", async () => {
    mockFetch(() => Response.json(summary));
    renderView({ wabas: [waba, otherWaba], selectedWabas: new Set() });

    // 300 templates in Meta (service conversations apart), 90 delivered from Salesforce.
    // The block is there while it loads: wait for its figures.
    const layer = within(await screen.findByRole("region", { name: "Todo WhatsApp, según Meta" }));
    expect(await layer.findByText("≈ 210")).toBeInTheDocument();
    expect(layer.getAllByText("300").length).toBeGreaterThan(0);
    expect(layer.getAllByText("200").length).toBeGreaterThan(0); // service conversations

    const rows = layer.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("DFO Escuela");
    expect(rows[1]).toHaveTextContent("Todo fuera");
    expect(rows[2]).toHaveTextContent("Campus MKT");
    expect(rows[2]).toHaveTextContent("≈ 30");
    expect(layer.getByText(/1 WABA envía solo fuera de Salesforce · 1 mixta/)).toHaveTextContent("30,0 %");
  });

  it("lists approved templates without sends in 90 days and sent ones gone from Meta", async () => {
    const fetchMock = mockFetch(() => Response.json(summary));
    const { onOpenTemplate } = renderView();

    expect(await screen.findByText(/de 2 plantillas aprobadas no se han enviado/)).toHaveTextContent("1 de 2");
    expect(fetchMock.mock.calls.map(([url]) => url)).toContainEqual(
      expect.stringContaining("/api/analytics/summary?waba=111&range=90d"),
    );
    fireEvent.click(screen.getByRole("button", { name: "never_sent" }));
    expect(onOpenTemplate).toHaveBeenCalledWith(unused);
    expect(screen.queryByRole("button", { name: "paused_one" })).toBeNull();
    expect(screen.getByText("Enviadas pero ya no existen en Meta (1)")).toBeInTheDocument();
  });

  it("splits by origin and filters by it", async () => {
    mockFetch(() => Response.json(summary));
    const { onOriginChange } = renderView();

    await screen.findByText("90 mensajes");
    const filter = within(screen.getByRole("group", { name: "Origen en Salesforce" }));
    fireEvent.click(filter.getByRole("button", { name: "Marketing Cloud" }));
    expect(onOriginChange).toHaveBeenLastCalledWith("mce");
    // The origin table links to the same filter.
    const [, deRow] = screen.getAllByTitle("Filtrar por este origen");
    fireEvent.click(deRow);
    expect(onOriginChange).toHaveBeenLastCalledWith("de");
  });

  it("asks for the origin when filtered", async () => {
    const fetchMock = mockFetch(() => Response.json({ ...summary, origin: "de" }));
    renderView({ origin: "de" });
    expect(await screen.findByText("desde Digital Engagement")).toBeInTheDocument();
    expect(fetchMock.mock.calls[0][0]).toContain("range=30d&origin=de");
  });

  it("picks a day on the chart and loads that day for the rest of the view", async () => {
    const day = { ...summary, totals: counts(60, 50, 20), period: { from: "2026-10-01", to: "2026-10-02" } };
    const fetchMock = mockFetch((url) => Response.json(url.includes("from=") ? day : summary));
    const { onDayChange } = renderView();
    await screen.findByText("90 mensajes");
    fireEvent.click(screen.getAllByTestId("chart-bar").at(-12)!);
    expect(onDayChange).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));

    cleanup();
    clearAnalyticsCache();
    const picked = renderView({ day: "2026-10-01" });
    expect(await screen.findByText("50 mensajes")).toBeInTheDocument();
    expect(fetchMock.mock.calls.map(([url]) => url)).toContainEqual(
      expect.stringContaining("from=2026-10-01&to=2026-10-02"),
    );
    expect(screen.getByText(/Mostrando/)).toHaveTextContent("Mostrando jue, 1 oct");
    fireEvent.click(screen.getByRole("button", { name: /Ver todo el periodo/ }));
    expect(picked.onDayChange).toHaveBeenCalledWith(null);
  });

  it("changes the range and shows API errors", async () => {
    mockFetch(() => Response.json({ error: "La consulta a Data Cloud falló (HTTP 500)" }, { status: 502 }));
    const { onRangeChange } = renderView({ selectedWabas: new Set() });

    expect((await screen.findAllByRole("alert"))[0]).toHaveTextContent("HTTP 500");
    expect(screen.getByRole("heading", { name: "Todas las WABAs" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "7 días" }));
    expect(onRangeChange).toHaveBeenCalledWith("7d");
  });
});

describe("TemplateAnalyticsTab", () => {
  const data: TemplateAnalytics = {
    range: "all",
    generatedAt: Date.now(),
    totals: counts(69, 69, 55, 0, 0, 30),
    daily: [{ day: "2026-05-26", ...counts(69, 69, 55) }],
    errors: [],
    origins: [{ origin: "DIGITAL_ENGAGEMENT", ...counts(69, 69, 55, 0, 0, 30) }],
    waba: counts(1000, 900, 600, 0, 0, 1500),
  };

  it("loads the whole history and compares with the WABA", async () => {
    const fetchMock = mockFetch(() => Response.json(data));
    render(<TemplateAnalyticsTab template={template} wabaId="111" />);

    expect(await screen.findByText("55 de 69 · en <1 min")).toBeInTheDocument();
    expect(screen.getAllByText("79,7 %")).toHaveLength(2);
    expect(fetchMock.mock.calls[0][0]).toContain("waba=111&name=campus_confirmation&lang=es_ES&range=all");
    expect(screen.getByText("sin incidencias")).toBeInTheDocument();
    expect(screen.getByText("Envíos por semana")).toBeInTheDocument();
    expect(screen.getByText(/13,0 puntos por encima de la media/)).toBeInTheDocument();
    expect(screen.getByText("Ningún fallo en el periodo.")).toBeInTheDocument();
    expect(screen.getByText("· WABA 25 min", { exact: false })).toBeInTheDocument();
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
    expect(sendPoints([{ day: "2026-10-05", value: 1500 }], true)[0].title).toBe("Semana del 5 oct: 1.500 envíos");
  });
});

describe("formatDuration", () => {
  it("reads like a person would say it", () => {
    expect(formatDuration(null)).toBe("—");
    expect(formatDuration(30)).toBe("<1 min");
    expect(formatDuration(125)).toBe("2 min");
    expect(formatDuration(3600)).toBe("1 h");
    expect(formatDuration(3720)).toBe("1 h 2 min");
    expect(formatDuration(129_600)).toBe("1,5 días");
  });
});

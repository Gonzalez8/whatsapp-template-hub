import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TopBar } from "@/components/TopBar";

const renderTopBar = (brand: { name?: string; logoUrl?: string; logoOnWhite?: boolean }) =>
  render(
    <TopBar
      search=""
      onSearchChange={() => {}}
      fetchedAt={Date.now()}
      syncing={false}
      cooldown={0}
      syncError={null}
      onSync={() => {}}
      view="list"
      onViewChange={() => {}}
      brand={brand}
    />,
  );

describe("TopBar branding", () => {
  it("shows only the WhatsApp mark and product name by default", () => {
    renderTopBar({});

    expect(screen.getByText("Template Hub")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("shows the company logo before the product, named after the company", () => {
    renderTopBar({ name: "Northius", logoUrl: "https://cdn.example.com/logo.svg" });

    expect(screen.getByRole("img", { name: "Northius" })).toHaveAttribute("src", "https://cdn.example.com/logo.svg");
    expect(screen.getByText("Template Hub")).toBeInTheDocument();
  });

  it("shows the company name as text when there is no logo", () => {
    renderTopBar({ name: "Northius" });

    expect(screen.getByText("Northius")).toBeInTheDocument();
  });

  it("puts the logo straight on the bar unless a white plate is configured", () => {
    const { unmount } = renderTopBar({ name: "Northius", logoUrl: "/logo.svg" });
    expect(screen.getByRole("img").parentElement).not.toHaveClass("bg-white");
    unmount();

    renderTopBar({ name: "Northius", logoUrl: "/logo.svg", logoOnWhite: true });
    expect(screen.getByRole("img").parentElement).toHaveClass("bg-white");
  });
});

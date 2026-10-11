import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TopBar } from "@/components/TopBar";

const renderTopBar = (brand: { name?: string; logoUrl?: string }) =>
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
});

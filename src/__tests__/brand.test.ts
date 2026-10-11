// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DEFAULT_BRAND_COLOR, contrast, getBrand } from "@/lib/brand";

describe("getBrand", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  it("uses the default look when nothing is configured", () => {
    const brand = getBrand({});

    expect(brand).toMatchObject({ name: undefined, logoUrl: undefined, color: DEFAULT_BRAND_COLOR });
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("reads name, logo and color", () => {
    const brand = getBrand({
      BRAND_NAME: "  Northius ",
      BRAND_LOGO_URL: "https://cdn.example.com/logo.svg",
      BRAND_COLOR: "0017ec",
    });

    expect(brand).toMatchObject({ name: "Northius", logoUrl: "https://cdn.example.com/logo.svg", color: "#0017EC" });
  });

  it("accepts a logo in /public and short hex colors", () => {
    expect(getBrand({ BRAND_LOGO_URL: "/logo.png", BRAND_COLOR: "#f60" })).toMatchObject({
      logoUrl: "/logo.png",
      color: "#FF6600",
    });
  });

  it("ignores invalid values and warns in the logs", () => {
    const brand = getBrand({ BRAND_COLOR: "verde", BRAND_LOGO_URL: "http://inseguro.com/logo.png" });

    expect(brand.color).toBe(DEFAULT_BRAND_COLOR);
    expect(brand.logoUrl).toBeUndefined();
    expect(console.warn).toHaveBeenCalledTimes(2);
  });

  it("puts dark text on light accents and white text on dark ones", () => {
    expect(getBrand({ BRAND_COLOR: "#CDFF4F" }).onColor).toBe("#0B1A12");
    expect(getBrand({ BRAND_COLOR: "#0017EC" }).onColor).toBe("#FFFFFF");
  });

  it("always derives an accent that reads as text on white", () => {
    for (const color of ["#CDFF4F", "#25D366", "#0017EC", "#FFFFFF"]) {
      expect(contrast(getBrand({ BRAND_COLOR: color }).inkColor, "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("derives a variant that stands out on the dark bars, even for dark brand colors", () => {
    for (const color of ["#0B1F4F", "#0017EC", "#25D366", "#000000"]) {
      const brand = getBrand({ BRAND_COLOR: color });
      expect(contrast(brand.brightColor, "#14181A")).toBeGreaterThanOrEqual(4.5);
      expect(contrast(brand.brightColor, brand.onBrightColor)).toBeGreaterThanOrEqual(4.5);
    }
    // A color that already stands out is kept as is.
    expect(getBrand({ BRAND_COLOR: "#25D366" }).brightColor).toBe("#25D366");
  });

  it("puts the logo on a white plate only when asked", () => {
    expect(getBrand({}).logoOnWhite).toBe(false);
    expect(getBrand({ BRAND_LOGO_BACKGROUND: "white" }).logoOnWhite).toBe(true);
  });
});

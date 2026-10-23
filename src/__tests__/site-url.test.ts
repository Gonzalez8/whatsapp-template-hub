// @vitest-environment node
import { describe, it, expect } from "vitest";
import { getSiteUrl } from "@/lib/site-url";

describe("getSiteUrl", () => {
  it("prefers SITE_URL, then the origin of AUTH_URL, then Vercel's production domain", () => {
    const vercel = { VERCEL_PROJECT_PRODUCTION_URL: "app.vercel.app" };
    const auth = { ...vercel, AUTH_URL: "https://templates.example.com/api/auth" };
    expect(getSiteUrl({ ...auth, SITE_URL: "https://site.example.com/" })?.href).toBe("https://site.example.com/");
    expect(getSiteUrl(auth)?.href).toBe("https://templates.example.com/");
    expect(getSiteUrl(vercel)?.href).toBe("https://app.vercel.app/");
  });

  it("skips values that are not URLs and is undefined when nothing is known", () => {
    expect(getSiteUrl({ SITE_URL: "no es una url", AUTH_URL: "https://a.example.com/x" })?.href).toBe(
      "https://a.example.com/",
    );
    expect(getSiteUrl({})).toBeUndefined();
  });
});

// @vitest-environment node
import { describe, it, expect } from "vitest";
import { getAuthConfig, isEmailAllowed, safeCallbackUrl } from "@/lib/auth-config";

const ENTRA = {
  AUTH_MICROSOFT_ENTRA_ID_ID: "client-id",
  AUTH_MICROSOFT_ENTRA_ID_SECRET: "client-secret",
  AUTH_MICROSOFT_ENTRA_ID_ISSUER: "https://login.microsoftonline.com/tenant-id/v2.0",
  AUTH_SECRET: "session-secret",
};

describe("getAuthConfig", () => {
  it("keeps login off when no Entra variable is set", () => {
    expect(getAuthConfig({})).toEqual({ status: "disabled" });
    // AUTH_SECRET alone does not turn it on.
    expect(getAuthConfig({ AUTH_SECRET: "x" })).toEqual({ status: "disabled" });
  });

  it("turns login on when every variable is set", () => {
    expect(getAuthConfig(ENTRA)).toEqual({ status: "enabled", allowedEmails: [] });
  });

  it("reports which variables are missing when half configured", () => {
    expect(getAuthConfig({ AUTH_MICROSOFT_ENTRA_ID_ID: "client-id", AUTH_SECRET: " " })).toEqual({
      status: "incomplete",
      missing: ["AUTH_MICROSOFT_ENTRA_ID_SECRET", "AUTH_MICROSOFT_ENTRA_ID_ISSUER", "AUTH_SECRET"],
    });
  });

  it("parses the optional allowlist", () => {
    const config = getAuthConfig({ ...ENTRA, AUTH_ALLOWED_EMAILS: " Ana@Empresa.com, ,luis@empresa.com " });
    expect(config).toEqual({ status: "enabled", allowedEmails: ["ana@empresa.com", "luis@empresa.com"] });
  });
});

describe("isEmailAllowed", () => {
  it("lets every tenant account in without an allowlist", () => {
    expect(isEmailAllowed("cualquiera@empresa.com", [])).toBe(true);
  });

  it("only lets listed emails in, ignoring case", () => {
    expect(isEmailAllowed("ANA@empresa.com", ["ana@empresa.com"])).toBe(true);
    expect(isEmailAllowed("otro@empresa.com", ["ana@empresa.com"])).toBe(false);
    expect(isEmailAllowed(undefined, ["ana@empresa.com"])).toBe(false);
  });
});

describe("safeCallbackUrl", () => {
  it("keeps same-site paths, query included", () => {
    expect(safeCallbackUrl("/?view=gallery&waba=1")).toBe("/?view=gallery&waba=1");
  });

  it("rejects anything that could leave the site", () => {
    for (const value of ["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "", null, undefined]) {
      expect(safeCallbackUrl(value)).toBe("/");
    }
  });
});

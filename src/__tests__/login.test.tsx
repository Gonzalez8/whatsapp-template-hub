import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  signOut: vi.fn(),
  requestTemplatesSync: vi.fn(async () => ({ status: "ok" as const })),
}));

vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("next-auth/react", () => ({ signOut: mocks.signOut }));
vi.mock("@/lib/templates", () => ({ requestTemplatesSync: mocks.requestTemplatesSync }));

const { syncTemplates } = await import("@/app/actions");
const { UserMenu } = await import("@/components/UserMenu");

const ENTRA = {
  AUTH_MICROSOFT_ENTRA_ID_ID: "client-id",
  AUTH_MICROSOFT_ENTRA_ID_SECRET: "client-secret",
  AUTH_MICROSOFT_ENTRA_ID_ISSUER: "https://login.microsoftonline.com/tenant-id/v2.0",
  AUTH_SECRET: "session-secret",
};

describe("syncTemplates with login", () => {
  beforeEach(() => {
    mocks.auth.mockReset();
    mocks.requestTemplatesSync.mockClear();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("works without a session while login is off", async () => {
    expect(await syncTemplates()).toEqual({ status: "ok" });
    expect(mocks.auth).not.toHaveBeenCalled();
  });

  it("refuses to sync without a session once login is on", async () => {
    for (const [name, value] of Object.entries(ENTRA)) vi.stubEnv(name, value);
    mocks.auth.mockResolvedValue(null);

    expect((await syncTemplates()).status).toBe("error");
    expect(mocks.requestTemplatesSync).not.toHaveBeenCalled();
  });

  it("syncs with a valid session", async () => {
    for (const [name, value] of Object.entries(ENTRA)) vi.stubEnv(name, value);
    mocks.auth.mockResolvedValue({ user: { email: "ana@empresa.com" } });

    expect(await syncTemplates()).toEqual({ status: "ok" });
  });

  it("refuses to sync when login is half configured", async () => {
    vi.stubEnv("AUTH_MICROSOFT_ENTRA_ID_ID", "client-id");

    expect((await syncTemplates()).status).toBe("error");
    expect(mocks.requestTemplatesSync).not.toHaveBeenCalled();
  });
});

describe("UserMenu", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("shows the signed-in user's initials and signs out to /login", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ user: { name: "Ana García", email: "ana@empresa.com" } })),
    );
    render(<UserMenu />);

    expect(await screen.findByText("AG")).toHaveAttribute("title", "ana@empresa.com");
    fireEvent.click(screen.getByRole("button", { name: "Salir" }));
    expect(mocks.signOut).toHaveBeenCalledWith({ redirectTo: "/login" });
  });

  it("renders nothing without a session", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({})),
    );
    const { container } = render(<UserMenu />);

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});

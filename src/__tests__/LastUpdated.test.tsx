import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { LastUpdated } from "@/components/LastUpdated";

const NOW = new Date("2026-10-11T12:00:00Z").getTime();

describe("LastUpdated", () => {
  afterEach(() => vi.useRealTimers());

  it.each([
    [10_000, "hace un momento"],
    [3 * 60_000, "hace 3 min"],
    [2 * 60 * 60_000, "hace 2 h"],
  ])("shows the age of a snapshot fetched %ims ago", (ago, expected) => {
    vi.useFakeTimers({ now: NOW });
    render(<LastUpdated fetchedAt={NOW - ago} />);
    expect(screen.getByText(`Plantillas actualizadas ${expected}`)).toBeInTheDocument();
  });
});

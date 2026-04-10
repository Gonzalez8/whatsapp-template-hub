import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { FilterDropdown } from "@/components/FilterDropdown";

afterEach(cleanup);

const items = [
  { id: "1", name: "Alpha Corp", count: 10 },
  { id: "2", name: "Beta Inc", count: 5 },
  { id: "3", name: "Gamma LLC", count: 3 },
  { id: "4", name: "Alpha Two", count: 1 },
];

function renderDropdown(props: Partial<Parameters<typeof FilterDropdown>[0]> = {}) {
  const onToggle = props.onToggle ?? vi.fn();
  const result = render(
    <FilterDropdown
      label="WABA"
      items={items}
      selected={props.selected ?? new Set()}
      onToggle={onToggle}
      searchable={props.searchable ?? false}
      searchPlaceholder={props.searchPlaceholder ?? "Buscar..."}
    />,
  );
  return { onToggle, ...result };
}

function getTrigger() {
  return screen.getByRole("button", { name: /WABA/i });
}

describe("FilterDropdown", () => {
  describe("basic behavior", () => {
    it("renders the label", () => {
      renderDropdown();
      expect(getTrigger()).toBeInTheDocument();
    });

    it("shows items when opened", () => {
      renderDropdown();
      fireEvent.click(getTrigger());

      expect(screen.getByText("Alpha Corp")).toBeInTheDocument();
      expect(screen.getByText("Beta Inc")).toBeInTheDocument();
    });

    it("calls onToggle when an item is clicked", () => {
      const { onToggle } = renderDropdown();
      fireEvent.click(getTrigger());
      fireEvent.click(screen.getByText("Beta Inc"));

      expect(onToggle).toHaveBeenCalledWith("2");
    });

    it("shows active count badge when items are selected", () => {
      renderDropdown({ selected: new Set(["1", "3"]) });
      expect(screen.getByText("2")).toBeInTheDocument();
    });
  });

  describe("searchable", () => {
    it("does not show search input when searchable is false", () => {
      renderDropdown({ searchable: false });
      fireEvent.click(getTrigger());

      expect(screen.queryByPlaceholderText("Buscar...")).not.toBeInTheDocument();
    });

    it("shows search input when searchable is true", () => {
      renderDropdown({ searchable: true });
      fireEvent.click(getTrigger());

      expect(screen.getByPlaceholderText("Buscar...")).toBeInTheDocument();
    });

    it("filters items by search query", () => {
      renderDropdown({ searchable: true });
      fireEvent.click(getTrigger());

      const searchInput = screen.getByPlaceholderText("Buscar...");
      fireEvent.change(searchInput, { target: { value: "alpha" } });

      expect(screen.getByText("Alpha Corp")).toBeInTheDocument();
      expect(screen.getByText("Alpha Two")).toBeInTheDocument();
      expect(screen.queryByText("Beta Inc")).not.toBeInTheDocument();
      expect(screen.queryByText("Gamma LLC")).not.toBeInTheDocument();
    });

    it("shows empty state when no items match", () => {
      renderDropdown({ searchable: true });
      fireEvent.click(getTrigger());

      const searchInput = screen.getByPlaceholderText("Buscar...");
      fireEvent.change(searchInput, { target: { value: "zzz" } });

      expect(screen.getByText("Sin resultados")).toBeInTheDocument();
    });

    it("uses custom searchPlaceholder", () => {
      renderDropdown({ searchable: true, searchPlaceholder: "Buscar WABA..." });
      fireEvent.click(getTrigger());

      expect(screen.getByPlaceholderText("Buscar WABA...")).toBeInTheDocument();
    });

    it("clears search query when dropdown is closed and reopened", () => {
      renderDropdown({ searchable: true });
      const trigger = getTrigger();

      // Open and type
      fireEvent.click(trigger);
      fireEvent.change(screen.getByPlaceholderText("Buscar..."), {
        target: { value: "alpha" },
      });
      expect(screen.queryByText("Beta Inc")).not.toBeInTheDocument();

      // Close
      fireEvent.click(trigger);

      // Reopen — all items should be visible again
      fireEvent.click(trigger);
      expect(screen.getByText("Alpha Corp")).toBeInTheDocument();
      expect(screen.getByText("Beta Inc")).toBeInTheDocument();
    });

    it("search is case-insensitive", () => {
      renderDropdown({ searchable: true });
      fireEvent.click(getTrigger());

      fireEvent.change(screen.getByPlaceholderText("Buscar..."), {
        target: { value: "BETA" },
      });

      expect(screen.getByText("Beta Inc")).toBeInTheDocument();
      expect(screen.queryByText("Alpha Corp")).not.toBeInTheDocument();
    });
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { PwaUpdateItem } from "./PwaUpdateItem";

import { SidebarProvider } from "@/components/ui/sidebar";
import { usePwaStore } from "@/stores/pwaStore";

function renderItem() {
  render(
    <SidebarProvider>
      <PwaUpdateItem />
    </SidebarProvider>,
  );
}

describe("PwaUpdateItem", () => {
  beforeAll(() => {
    // jsdom has no matchMedia; SidebarProvider's mobile detection needs it.
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  });

  beforeEach(() => {
    usePwaStore.setState({
      needRefresh: false,
      checking: false,
      checkForUpdate: () => undefined,
      applyUpdate: () => undefined,
    });
  });

  it("offers a manual update check by default", () => {
    const checkForUpdate = vi.fn();
    usePwaStore.setState({
      checkForUpdate,
    });
    renderItem();
    fireEvent.click(screen.getByRole("button", {
      name: "Check for updates",
    }));
    expect(checkForUpdate).toHaveBeenCalledTimes(1);
  });

  it("disables the button while a check is in flight", () => {
    usePwaStore.setState({
      checking: true,
    });
    renderItem();
    expect(screen.getByRole("button", {
      name: "Check for updates",
    })).toBeDisabled();
  });

  it("applies the waiting update when one is available", () => {
    const applyUpdate = vi.fn();
    usePwaStore.setState({
      needRefresh: true,
      applyUpdate,
    });
    renderItem();
    fireEvent.click(screen.getByRole("button", {
      name: "Update available",
    }));
    expect(applyUpdate).toHaveBeenCalledTimes(1);
  });
});

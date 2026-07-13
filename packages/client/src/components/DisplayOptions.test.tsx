import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { DisplayOptions } from "./DisplayOptions";

import { useDisplayStore } from "@/stores/displayStore";

function openPopover() {
  render(<DisplayOptions />);
  fireEvent.click(screen.getByRole("button", {
    name: "Display options",
  }));
}

describe("DisplayOptions", () => {
  beforeEach(() => {
    useDisplayStore.setState({
      theme: "light",
      textSize: "regular",
      focusMode: false,
      superFocus: false,
      superFocusSpace: "s",
      containerWidth: "normal",
    });
  });

  it("renders a trigger with an accessible name", () => {
    render(<DisplayOptions />);
    expect(screen.getByRole("button", {
      name: "Display options",
    })).toBeInTheDocument();
  });

  it("shows the display controls when opened", () => {
    openPopover();
    expect(screen.getByRole("group", {
      name: "Text size",
    })).toBeInTheDocument();
    expect(screen.getByRole("switch", {
      name: "Dark mode",
    })).toBeInTheDocument();
    expect(screen.getByRole("switch", {
      name: "Focus mode",
    })).toBeInTheDocument();
    expect(screen.getByRole("switch", {
      name: "Super focus mode",
    })).toBeInTheDocument();
    expect(screen.getByRole("switch", {
      name: "Wide content",
    })).toBeInTheDocument();
  });

  it("sets the text size when a size is picked", () => {
    openPopover();
    fireEvent.click(screen.getByRole("button", {
      name: "XL",
    }));
    expect(useDisplayStore.getState().textSize).toBe("xl");
  });

  it("sets the text size to XXL", () => {
    openPopover();
    fireEvent.click(screen.getByRole("button", {
      name: "XXL",
    }));
    expect(useDisplayStore.getState().textSize).toBe("xxl");
  });

  it("switches to dark theme via the Dark mode toggle", () => {
    openPopover();
    fireEvent.click(screen.getByRole("switch", {
      name: "Dark mode",
    }));
    expect(useDisplayStore.getState().theme).toBe("dark");
  });

  it("enables focus mode via its toggle", () => {
    openPopover();
    fireEvent.click(screen.getByRole("switch", {
      name: "Focus mode",
    }));
    expect(useDisplayStore.getState().focusMode).toBe(true);
  });

  it("enables super focus mode via its toggle", () => {
    openPopover();
    fireEvent.click(screen.getByRole("switch", {
      name: "Super focus mode",
    }));
    expect(useDisplayStore.getState().superFocus).toBe(true);
  });

  it("reveals the Field spacing control only when super focus is on", () => {
    openPopover();
    expect(screen.queryByRole("group", {
      name: "Field spacing",
    })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("switch", {
      name: "Super focus mode",
    }));
    expect(screen.getByRole("group", {
      name: "Field spacing",
    })).toBeInTheDocument();
  });

  it("sets the super focus field spacing", () => {
    useDisplayStore.setState({
      superFocus: true,
    });
    openPopover();
    const spacing = screen.getByRole("group", {
      name: "Field spacing",
    });
    fireEvent.click(within(spacing).getByRole("button", {
      name: "L",
    }));
    expect(useDisplayStore.getState().superFocusSpace).toBe("l");
  });

  it("widens the content via the Wide content toggle", () => {
    openPopover();
    fireEvent.click(screen.getByRole("switch", {
      name: "Wide content",
    }));
    expect(useDisplayStore.getState().containerWidth).toBe("wide");
  });
});

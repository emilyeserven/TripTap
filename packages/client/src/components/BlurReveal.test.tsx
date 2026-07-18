import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BlurReveal } from "./BlurReveal";

describe("BlurReveal", () => {
  it("hides its content behind a blur until clicked", () => {
    render(<BlurReveal>secret meaning</BlurReveal>);

    const el = screen.getByRole("button", {
      name: "Reveal translation",
    });
    expect(el.className).toContain("blur-[3px]");
    expect(screen.getByText("secret meaning")).toBeInTheDocument();

    fireEvent.click(el);

    expect(el.className).toContain("blur-none");
    expect(el.className).not.toContain("blur-[3px]");
    expect(screen.queryByRole("button", {
      name: "Reveal translation",
    })).not.toBeInTheDocument();
  });

  it("reveals on Enter for keyboard users", () => {
    render(<BlurReveal label="Show it">secret</BlurReveal>);

    const el = screen.getByRole("button", {
      name: "Show it",
    });
    fireEvent.keyDown(el, {
      key: "Enter",
    });

    expect(el.className).toContain("blur-none");
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AnswerChoiceGroup } from "./AnswerChoiceGroup";

describe("AnswerChoiceGroup", () => {
  it("marks the selected option pressed and reports a pick", () => {
    const onSelect = vi.fn();
    render(
      <AnswerChoiceGroup
        value="True"
        choices={["True", "False"]}
        onSelect={onSelect}
      />,
    );
    expect(screen.getByRole("button", {
      name: "True",
    }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", {
      name: "False",
    }).getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(screen.getByRole("button", {
      name: "False",
    }));
    expect(onSelect).toHaveBeenCalledWith("False");
  });

  it("clears the value when the selected option is clicked again", () => {
    const onSelect = vi.fn();
    render(
      <AnswerChoiceGroup
        value="が"
        choices={["は", "が", "を"]}
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByRole("button", {
      name: "が",
    }));
    expect(onSelect).toHaveBeenCalledWith("");
  });
});

import { useState } from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { QuestionAnswerTypeEditor } from "./QuestionAnswerTypeEditor";

/** Controlled harness so patches flow back in, mirroring how QuestionListEditor drives it. */
function Harness({
  onChange,
}: { onChange?: (t: string | undefined, c: string[]) => void }) {
  const [answerType, setAnswerType] = useState<"text" | "boolean" | "choice" | undefined>();
  const [choices, setChoices] = useState<string[]>([]);
  return (
    <QuestionAnswerTypeEditor
      answerType={answerType}
      choices={choices}
      onChange={(patch) => {
        const nextType = patch.answerType ?? answerType;
        const nextChoices = patch.choices ?? choices;
        if (patch.answerType !== undefined) setAnswerType(patch.answerType);
        if (patch.choices !== undefined) setChoices(patch.choices);
        onChange?.(nextType, nextChoices);
      }}
    />
  );
}

describe("QuestionAnswerTypeEditor", () => {
  it("shows only the type picker for the default text type", () => {
    render(<Harness />);
    expect(screen.getByRole("button", {
      name: "Text",
      pressed: true,
    })).toBeTruthy();
    expect(screen.queryByLabelText("Option 1")).toBeNull();
  });

  it("explains the fixed options when True/False is picked", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", {
      name: "True / False",
    }));
    expect(screen.getByText(/True \/ False button group/)).toBeTruthy();
    expect(screen.queryByLabelText("Option 1")).toBeNull();
  });

  it("reveals an options editor for multiple choice and adds options", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", {
      name: "Multiple choice",
    }));

    // One blank option row shows by default.
    const first = screen.getByLabelText("Option 1");
    fireEvent.change(first, {
      target: {
        value: "は",
      },
    });

    fireEvent.click(screen.getByRole("button", {
      name: /Add option/,
    }));
    fireEvent.change(screen.getByLabelText("Option 2"), {
      target: {
        value: "が",
      },
    });

    expect(onChange).toHaveBeenLastCalledWith("choice", ["は", "が"]);
  });

  it("removes an option", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", {
      name: "Multiple choice",
    }));
    fireEvent.change(screen.getByLabelText("Option 1"), {
      target: {
        value: "は",
      },
    });
    fireEvent.click(screen.getByRole("button", {
      name: /Add option/,
    }));
    fireEvent.change(screen.getByLabelText("Option 2"), {
      target: {
        value: "が",
      },
    });

    fireEvent.click(screen.getByRole("button", {
      name: "Remove option 1",
    }));
    expect(onChange).toHaveBeenLastCalledWith("choice", ["が"]);
  });

  it("fills options from a letter range", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", {
      name: "Multiple choice",
    }));

    const fill = screen.getByRole("button", {
      name: "Fill options",
    });
    // Disabled until the range parses.
    expect(fill).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Option range"), {
      target: {
        value: "a-e",
      },
    });
    // Preview shows the expansion and the button enables.
    expect(screen.getByText("→ a, b, c, d, e")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", {
      name: "Fill options",
    }));
    expect(onChange).toHaveBeenLastCalledWith("choice", ["a", "b", "c", "d", "e"]);
  });

  it("keeps the fill action disabled for an invalid range", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", {
      name: "Multiple choice",
    }));
    fireEvent.change(screen.getByLabelText("Option range"), {
      target: {
        value: "e-a",
      },
    });
    expect(screen.getByRole("button", {
      name: "Fill options",
    })).toBeDisabled();
    expect(screen.getByText(/Enter a range like/)).toBeTruthy();
  });
});

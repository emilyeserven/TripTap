import type { QuestionSheetQuestion } from "@sentence-bank/types";

import { useState } from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { QuestionListEditor } from "./QuestionListEditor";

// PartsEditor is stubbed out so these focus on quick-fill / the sheet-wide answer type. The
// QuestionAnswerTypeEditor is stubbed with a button that reports a fixed patch, so we can assert both
// how many instances render and that a change flows through.
vi.mock("@/components/PartsEditor", () => ({
  PartsEditor: () => null,
}));
vi.mock("@/components/QuestionAnswerTypeEditor", () => ({
  QuestionAnswerTypeEditor: ({
    onChange,
  }: { onChange: (patch: { answerType?: string }) => void }) => (
    <button
      type="button"
      onClick={() => onChange({
        answerType: "boolean",
      })}
    >
      mock-answer-type
    </button>
  ),
}));

/** Controlled harness capturing the latest questions array. */
function Harness({
  onQuestions,
  initial = [],
}: { onQuestions: (q: QuestionSheetQuestion[]) => void;
  initial?: QuestionSheetQuestion[]; }) {
  const [questions, setQuestions] = useState<QuestionSheetQuestion[]>(initial);
  return (
    <QuestionListEditor
      questions={questions}
      onChange={(next) => {
        setQuestions(next);
        onQuestions(next);
      }}
    />
  );
}

describe("QuestionListEditor quick-fill", () => {
  it("generates N numbered questions by default (1, 2, 3 style)", () => {
    const onQuestions = vi.fn();
    render(<Harness onQuestions={onQuestions} />);

    fireEvent.change(screen.getByLabelText("Quick fill — number of questions"), {
      target: {
        value: "3",
      },
    });
    fireEvent.click(screen.getByRole("button", {
      name: "Set questions",
    }));

    const last = onQuestions.mock.calls.at(-1)?.[0] as QuestionSheetQuestion[];
    expect(last).toHaveLength(3);
    expect(last.map(q => q.prompt)).toEqual(["1", "2", "3"]);
  });

  it("defaults the label-style picker to 1, 2, 3", () => {
    render(<Harness onQuestions={vi.fn()} />);
    expect(screen.getByLabelText("Question label style").textContent).toContain("1, 2, 3");
  });

  it("ignores a non-positive count", () => {
    const onQuestions = vi.fn();
    render(<Harness onQuestions={onQuestions} />);
    fireEvent.change(screen.getByLabelText("Quick fill — number of questions"), {
      target: {
        value: "0",
      },
    });
    fireEvent.click(screen.getByRole("button", {
      name: "Set questions",
    }));
    expect(onQuestions).not.toHaveBeenCalled();
  });
});

describe("QuestionListEditor sheet-wide answer type", () => {
  /** Fill the editor with `n` flat questions via quick-fill. */
  function fillQuestions(n: number) {
    fireEvent.change(screen.getByLabelText("Quick fill — number of questions"), {
      target: {
        value: String(n),
      },
    });
    fireEvent.click(screen.getByRole("button", {
      name: "Set questions",
    }));
  }

  it("shows no answer-type control until there are questions", () => {
    render(<Harness onQuestions={vi.fn()} />);
    expect(screen.queryByText("mock-answer-type")).not.toBeInTheDocument();
  });

  it("offers a single sheet-wide control for a flat sheet and applies it to every question", () => {
    const onQuestions = vi.fn();
    render(<Harness onQuestions={onQuestions} />);
    fillQuestions(3);

    // One control (sheet-wide) — flat questions don't each get their own.
    const controls = screen.getAllByText("mock-answer-type");
    expect(controls).toHaveLength(1);

    fireEvent.click(controls[0]);
    const last = onQuestions.mock.calls.at(-1)?.[0] as QuestionSheetQuestion[];
    expect(last).toHaveLength(3);
    expect(last.every(q => q.answerType === "boolean")).toBe(true);
  });

  it("falls back to a per-question control once any question has sub-parts", () => {
    render(
      <Harness
        onQuestions={vi.fn()}
        initial={[
          {
            id: "q1",
            prompt: "One",
            parts: [{
              id: "pa",
              label: "(a)",
            }],
          },
          {
            id: "q2",
            prompt: "Two",
          },
        ]}
      />,
    );
    // One control per question (2), and no sheet-wide label.
    expect(screen.getAllByText("mock-answer-type")).toHaveLength(2);
    expect(screen.queryByText("Answer type — applies to every question")).not.toBeInTheDocument();
  });
});

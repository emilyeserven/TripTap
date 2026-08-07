import type { QuestionSheetQuestion } from "@sentence-bank/types";

import { useState } from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { QuestionListEditor } from "./QuestionListEditor";

// PartsEditor / QuestionAnswerTypeEditor render per question; stub them so this focuses on quick-fill.
vi.mock("@/components/PartsEditor", () => ({
  PartsEditor: () => null,
}));
vi.mock("@/components/QuestionAnswerTypeEditor", () => ({
  QuestionAnswerTypeEditor: () => null,
}));

/** Controlled harness capturing the latest questions array. */
function Harness({
  onQuestions,
}: { onQuestions: (q: QuestionSheetQuestion[]) => void }) {
  const [questions, setQuestions] = useState<QuestionSheetQuestion[]>([]);
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
  it("generates N blank questions by default (Blank style)", () => {
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
    expect(last.map(q => q.prompt)).toEqual(["", "", ""]);
  });

  it("defaults the label-style picker to Blank", () => {
    render(<Harness onQuestions={vi.fn()} />);
    expect(screen.getByLabelText("Question label style").textContent).toContain("Blank");
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

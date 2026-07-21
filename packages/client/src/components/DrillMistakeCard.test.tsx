import type { DrillMistake, DrillReasonCategory } from "@sentence-bank/types";
import type { ReactElement } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DrillMistakeCard } from "./DrillMistakeCard";

/** The card embeds the Tatoeba example picker, which uses a react-query mutation. */
function renderCard(ui: ReactElement) {
  const client = new QueryClient();
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const categories: DrillReasonCategory[] = [
  {
    id: "cat-1",
    name: "Grammar",
    subcategories: null,
    reasons: [{
      id: "r-1",
      name: "Wrong tense",
    }],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
];

function mistake(over: Partial<DrillMistake>): DrillMistake {
  return {
    id: "m-1",
    question: null,
    prompt: "食べました",
    correctAnswer: null,
    reasons: [],
    reflection: null,
    ...over,
  };
}

describe("DrillMistakeCard", () => {
  it("renders a bare prompt as the headline when there is no question", () => {
    renderCard(
      <DrillMistakeCard
        mistake={mistake({})}
        categories={categories}
      />,
    );
    expect(screen.getByText("食べました")).toBeInTheDocument();
    expect(screen.queryByText(/You put:/)).not.toBeInTheDocument();
  });

  it("labels the learner's answer and shows the correction when a question exists", () => {
    renderCard(
      <DrillMistakeCard
        mistake={mistake({
          question: "昨日、何をしましたか",
          correctAnswer: "食べた",
        })}
        categories={categories}
      />,
    );
    expect(screen.getByText("昨日、何をしましたか")).toBeInTheDocument();
    expect(screen.getByText(/You put:/)).toBeInTheDocument();
    expect(screen.getByText("食べた")).toBeInTheDocument();
  });

  it("prefills the Tatoeba search box with the question when one exists", () => {
    renderCard(
      <DrillMistakeCard
        mistake={mistake({
          question: "昨日、何をしましたか",
          correctAnswer: "食べた",
        })}
        categories={categories}
      />,
    );
    expect(screen.getByLabelText<HTMLInputElement>("Tatoeba search").value)
      .toBe("昨日、何をしましたか");
  });

  it("falls back to the correct answer, then the prompt, when there is no question", () => {
    renderCard(
      <DrillMistakeCard
        mistake={mistake({
          correctAnswer: "食べた",
        })}
        categories={categories}
      />,
    );
    expect(screen.getByLabelText<HTMLInputElement>("Tatoeba search").value).toBe("食べた");
  });

  it("shows a skipped note (not a blank answer) when the prompt is empty and a question exists", () => {
    renderCard(
      <DrillMistakeCard
        mistake={mistake({
          question: "昨日、何をしましたか",
          prompt: "",
        })}
        categories={categories}
      />,
    );
    expect(screen.getByText("You skipped this one.")).toBeInTheDocument();
    expect(screen.queryByText(/You put:/)).not.toBeInTheDocument();
  });

  it("shows a skipped headline when both the prompt and question are empty", () => {
    renderCard(
      <DrillMistakeCard
        mistake={mistake({
          prompt: "  ",
          correctAnswer: "食べた",
        })}
        categories={categories}
      />,
    );
    expect(screen.getByText("Skipped — no answer given.")).toBeInTheDocument();
  });

  it("resolves reason refs to their taxonomy labels, falling back for deleted refs", () => {
    renderCard(
      <DrillMistakeCard
        mistake={mistake({
          reasons: [
            {
              categoryId: "cat-1",
              reasonId: "r-1",
            },
            {
              categoryId: "gone",
              reasonId: "gone-r",
            },
          ],
        })}
        categories={categories}
      />,
    );
    expect(screen.getByText("Grammar › Wrong tense")).toBeInTheDocument();
    expect(screen.getByText("(deleted reason)")).toBeInTheDocument();
  });
});

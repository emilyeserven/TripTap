import type { Sentence } from "@sentence-bank/types";
import type { ReactElement } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SentenceCard } from "./SentenceCard";

/** SentenceCard uses a react-query hook (linked-vocab breakdown), so it needs a QueryClient. */
function renderCard(ui: ReactElement) {
  const client = new QueryClient();
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const sentence: Sentence = {
  id: "11111111-1111-1111-1111-111111111111",
  text: "毎朝コーヒーを飲みます。",
  translation: "I drink coffee every morning.",
  reading: null,
  language: "Japanese",
  source: "Genki I, Lesson 3",
  sourceId: null,
  page: null,
  notes: "Uses the ます-form.",
  tags: "verbs, routine",
  captureId: null,
  createdAt: "2026-06-01T00:00:00.000Z",
};

describe("SentenceCard", () => {
  it("renders the sentence text and translation", () => {
    renderCard(<SentenceCard sentence={sentence} />);
    expect(screen.getByText("毎朝コーヒーを飲みます。")).toBeInTheDocument();
    expect(screen.getByText("I drink coffee every morning.")).toBeInTheDocument();
  });

  it("hides the translation when showTranslation is false", () => {
    renderCard(
      <SentenceCard
        sentence={sentence}
        showTranslation={false}
      />,
    );
    expect(screen.getByText("毎朝コーヒーを飲みます。")).toBeInTheDocument();
    expect(screen.queryByText("I drink coffee every morning.")).not.toBeInTheDocument();
  });

  it("calls onDelete with the sentence id when the delete button is clicked", () => {
    const onDelete = vi.fn();
    renderCard(
      <SentenceCard
        sentence={sentence}
        onDelete={onDelete}
      />,
    );
    screen.getByRole("button", {
      name: "Delete",
    }).click();
    expect(onDelete).toHaveBeenCalledWith(sentence.id);
  });
});

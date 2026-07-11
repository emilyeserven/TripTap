import type { Sentence } from "@sentence-bank/types";

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SentenceCard } from "./SentenceCard";

const sentence: Sentence = {
  id: "11111111-1111-1111-1111-111111111111",
  text: "毎朝コーヒーを飲みます。",
  translation: "I drink coffee every morning.",
  language: "Japanese",
  source: "Genki I, Lesson 3",
  sourceId: null,
  page: null,
  notes: "Uses the ます-form.",
  tags: "verbs, routine",
  createdAt: "2026-06-01T00:00:00.000Z",
};

describe("SentenceCard", () => {
  it("renders the sentence text and translation", () => {
    render(<SentenceCard sentence={sentence} />);
    expect(screen.getByText("毎朝コーヒーを飲みます。")).toBeInTheDocument();
    expect(screen.getByText("I drink coffee every morning.")).toBeInTheDocument();
  });

  it("hides the translation when showTranslation is false", () => {
    render(
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
    render(
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

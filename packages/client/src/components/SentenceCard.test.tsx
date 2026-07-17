import type { Sentence } from "@sentence-bank/types";
import type { ReactElement } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

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
  readingError: null,
  language: "Japanese",
  source: "Genki I, Lesson 3",
  sourceId: null,
  page: null,
  notes: "Uses the ます-form.",
  tags: "verbs, routine",
  terms: null,
  captureId: null,
  hasAudio: false,
  hasImage: false,
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

  it("groups term badges by channel and defaults uncategorized terms to Vocabulary", () => {
    renderCard(
      <SentenceCard
        sentence={{
          ...sentence,
          terms: [
            {
              id: "v1",
              name: "コーヒー",
              kind: "taxonomy",
              sourceId: "s1",
              sourceLabel: "Nouns",
              category: "vocabulary",
            },
            {
              id: "g1",
              name: "ます-form",
              kind: "taxonomy",
              sourceId: "s2",
              sourceLabel: "Grammar",
              category: "grammar",
            },
            {
              id: "x1",
              name: "丁寧",
              kind: "taxonomy",
              sourceId: "s3",
              sourceLabel: "Register",
              category: "general",
            },
            // No category → treated as Vocabulary.
            {
              id: "v2",
              name: "毎朝",
              kind: "taxonomy",
              sourceId: "s1",
              sourceLabel: "Nouns",
            } as never,
          ],
        }}
      />,
    );
    expect(screen.getByText("Vocabulary:")).toBeInTheDocument();
    expect(screen.getByText("Grammar:")).toBeInTheDocument();
    expect(screen.getByText("General:")).toBeInTheDocument();
    expect(screen.getByText("コーヒー")).toBeInTheDocument();
    expect(screen.getByText("毎朝")).toBeInTheDocument();
    expect(screen.getByText("ます-form")).toBeInTheDocument();
    expect(screen.getByText("丁寧")).toBeInTheDocument();
  });
});

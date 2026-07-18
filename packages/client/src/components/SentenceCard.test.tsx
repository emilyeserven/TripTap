import type { Sentence } from "@sentence-bank/types";
import type { ReactElement } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
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
  vocabCount: 0,
  createdAt: "2026-06-01T00:00:00.000Z",
};

describe("SentenceCard", () => {
  it("renders the sentence text and translation", () => {
    renderCard(<SentenceCard sentence={sentence} />);
    expect(screen.getByText("毎朝コーヒーを飲みます。")).toBeInTheDocument();
    expect(screen.getByText("I drink coffee every morning.")).toBeInTheDocument();
  });

  it("blurs the translation behind a reveal control when showTranslation is false", () => {
    renderCard(
      <SentenceCard
        sentence={sentence}
        showTranslation={false}
      />,
    );
    expect(screen.getByText("毎朝コーヒーを飲みます。")).toBeInTheDocument();
    // The translation stays in the DOM but blurred behind the standard reveal control (study mode).
    const reveal = screen.getByRole("button", {
      name: "Reveal translation",
    });
    expect(reveal).toHaveTextContent("I drink coffee every morning.");
    expect(reveal.className).toContain("blur-[3px]");
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

  it("reveals the hidden translation on click", () => {
    renderCard(
      <SentenceCard
        sentence={sentence}
        showTranslation={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", {
      name: "Reveal translation",
    }));
    expect(screen.getByText("I drink coffee every morning.")).toBeInTheDocument();
  });

  it("blurs the furigana when the sentence declares a target vocab (has linked vocab)", () => {
    const reading = [
      {
        t: "毎朝",
        r: "まいあさ",
      },
      {
        t: "コーヒー。",
        r: null,
      },
    ];
    // Linked vocab present → the reading is blurred behind the standard reveal control.
    const {
      unmount,
    } = renderCard(
      <SentenceCard
        sentence={{
          ...sentence,
          reading,
          vocabCount: 2,
        }}
      />,
    );
    const reveal = screen.getByRole("button", {
      name: "Reveal reading",
    });
    expect(reveal).toHaveTextContent("まいあさ");
    expect(reveal.className).toContain("blur-[3px]");
    unmount();

    // No linked vocab → the reading shows crisp (no reveal control).
    renderCard(
      <SentenceCard
        sentence={{
          ...sentence,
          reading,
          vocabCount: 0,
        }}
      />,
    );
    expect(screen.queryByRole("button", {
      name: "Reveal reading",
    })).not.toBeInTheDocument();
    expect(screen.getByText("まいあさ")).toBeInTheDocument();
  });

  it("calls onEdit with the sentence when the Edit button is clicked", () => {
    const onEdit = vi.fn();
    renderCard(
      <SentenceCard
        sentence={sentence}
        onEdit={onEdit}
      />,
    );
    fireEvent.click(screen.getByRole("button", {
      name: "Edit",
    }));
    expect(onEdit).toHaveBeenCalledWith(sentence);
  });

  it("makes grammar badges clickable filters when onGrammarTagClick is provided", () => {
    const onGrammarTagClick = vi.fn();
    renderCard(
      <SentenceCard
        sentence={{
          ...sentence,
          terms: [
            {
              id: "g1",
              name: "ます-form",
              kind: "taxonomy",
              sourceId: "s2",
              sourceLabel: "Grammar",
              category: "grammar",
            },
          ],
        }}
        onGrammarTagClick={onGrammarTagClick}
      />,
    );
    fireEvent.click(screen.getByTitle("Filter by ます-form"));
    expect(onGrammarTagClick).toHaveBeenCalledWith("g1");
  });
});

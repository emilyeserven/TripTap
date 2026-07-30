import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AiLessonTemplate } from "./AiLessonTemplate";

import { aiLessonDetailFixture } from "@/test-utils/aiLessonFixture";

describe("AiLessonTemplate", () => {
  it("renders the AI Lesson chrome and the default Culture pane", () => {
    render(<AiLessonTemplate aiLesson={aiLessonDetailFixture} />);

    // Header chrome from the AI Lesson meta.
    expect(screen.getByRole("heading", {
      name: "カフェで注文",
    })).toBeInTheDocument();
    expect(screen.getByText("Ordering drinks and paying.")).toBeInTheDocument();
    expect(screen.getByText("Everyday Japanese")).toBeInTheDocument();

    // Culture is the default tab — its card heading is visible.
    expect(screen.getByText("Café culture")).toBeInTheDocument();

    // The five tabs are present.
    expect(screen.getByRole("tab", {
      name: /Culture/,
    })).toBeInTheDocument();
    expect(screen.getByRole("tab", {
      name: /Vocabulary/,
    })).toBeInTheDocument();
    expect(screen.getByRole("tab", {
      name: /Practice/,
    })).toBeInTheDocument();
  });

  it("normalizes the source tab label to 'Sentences'", () => {
    render(<AiLessonTemplate aiLesson={aiLessonDetailFixture} />);
    expect(screen.getByRole("tab", {
      name: /Sentences/,
    })).toBeInTheDocument();
    // The per-AI-Lesson sourceLabel ("Examples") is no longer shown as the tab title.
    expect(screen.queryByRole("tab", {
      name: /Examples/,
    })).not.toBeInTheDocument();
  });

  it("shows the reading-level toggle when only grammar carries an easy layer", () => {
    // The base fixture has no dual-level content, so no toggle.
    const {
      rerender,
    } = render(<AiLessonTemplate aiLesson={aiLessonDetailFixture} />);
    expect(screen.queryByText(/くわしい|やさしい/)).not.toBeInTheDocument();

    // Grammar easyEx alone should surface the 易/難 toggle.
    rerender(
      <AiLessonTemplate
        aiLesson={{
          ...aiLessonDetailFixture,
          grammar: aiLessonDetailFixture.grammar.map(g => ({
            ...g,
            easyEx: [{
              jp: "コーヒー、ください。",
              en: "Coffee, please.",
            }],
          })),
        }}
      />,
    );
    expect(screen.getByText(/くわしい|やさしい/)).toBeInTheDocument();
  });

  it("renders an extra tab for each custom section, after the built-ins", () => {
    render(
      <AiLessonTemplate
        aiLesson={{
          ...aiLessonDetailFixture,
          sections: [
            {
              title: "Kanji",
              body: "# 漢字",
            },
            {
              title: "Listening",
              body: "Notes",
            },
          ],
        }}
      />,
    );

    // Each custom section becomes its own tab, alongside the built-in ones.
    expect(screen.getByRole("tab", {
      name: /Kanji/,
    })).toBeInTheDocument();
    expect(screen.getByRole("tab", {
      name: /Listening/,
    })).toBeInTheDocument();
    expect(screen.getByRole("tab", {
      name: /Practice/,
    })).toBeInTheDocument();

    // Custom tabs come after the five built-ins.
    const tabNames = screen.getAllByRole("tab").map(t => t.textContent);
    expect(tabNames).toEqual(["Culture", "Vocabulary", "Grammar", "Sentences", "Practice", "Kanji", "Listening"]);
  });
});

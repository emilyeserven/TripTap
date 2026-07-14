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
});

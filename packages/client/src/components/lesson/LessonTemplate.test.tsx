import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LessonTemplate } from "./LessonTemplate";

import { lessonDetailFixture } from "@/test-utils/lessonFixture";

describe("LessonTemplate", () => {
  it("renders the lesson chrome and the default Culture pane", () => {
    render(<LessonTemplate lesson={lessonDetailFixture} />);

    // Header chrome from the lesson meta.
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
    render(<LessonTemplate lesson={lessonDetailFixture} />);
    expect(screen.getByRole("tab", {
      name: /Sentences/,
    })).toBeInTheDocument();
    // The per-lesson sourceLabel ("Examples") is no longer shown as the tab title.
    expect(screen.queryByRole("tab", {
      name: /Examples/,
    })).not.toBeInTheDocument();
  });
});

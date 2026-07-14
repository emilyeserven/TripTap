import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AiLessonFilterChips } from "./ai-lesson-filter";
import { uniqueAiLessons } from "./ai-lesson-filter-utils";

const items = [
  {
    aiLessonSlug: "a",
    aiLessonTitle: "AI Lesson A",
  },
  {
    aiLessonSlug: "b",
    aiLessonTitle: "AI Lesson B",
  },
  {
    aiLessonSlug: "a",
    aiLessonTitle: "AI Lesson A",
  },
];

describe("uniqueAiLessons", () => {
  it("dedupes by slug, preserving first-seen order", () => {
    expect(uniqueAiLessons(items)).toEqual([
      {
        slug: "a",
        title: "AI Lesson A",
      },
      {
        slug: "b",
        title: "AI Lesson B",
      },
    ]);
  });
});

describe("AiLessonFilterChips", () => {
  it("renders All + one chip per AI Lesson and reports the chosen slug", () => {
    const onChange = vi.fn();
    render(
      <AiLessonFilterChips
        aiLessons={uniqueAiLessons(items)}
        value="all"
        onChange={onChange}
      />,
    );
    expect(screen.getByRole("button", {
      name: "All",
    })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", {
      name: "AI Lesson B",
    }));
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("hides itself when there is only one AI Lesson", () => {
    const {
      container,
    } = render(
      <AiLessonFilterChips
        aiLessons={[{
          slug: "a",
          title: "AI Lesson A",
        }]}
        value="all"
        onChange={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

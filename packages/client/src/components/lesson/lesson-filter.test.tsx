import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LessonFilterChips } from "./lesson-filter";
import { uniqueLessons } from "./lesson-filter-utils";

const items = [
  {
    lessonSlug: "a",
    lessonTitle: "Lesson A",
  },
  {
    lessonSlug: "b",
    lessonTitle: "Lesson B",
  },
  {
    lessonSlug: "a",
    lessonTitle: "Lesson A",
  },
];

describe("uniqueLessons", () => {
  it("dedupes by slug, preserving first-seen order", () => {
    expect(uniqueLessons(items)).toEqual([
      {
        slug: "a",
        title: "Lesson A",
      },
      {
        slug: "b",
        title: "Lesson B",
      },
    ]);
  });
});

describe("LessonFilterChips", () => {
  it("renders All + one chip per lesson and reports the chosen slug", () => {
    const onChange = vi.fn();
    render(
      <LessonFilterChips
        lessons={uniqueLessons(items)}
        value="all"
        onChange={onChange}
      />,
    );
    expect(screen.getByRole("button", {
      name: "All",
    })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", {
      name: "Lesson B",
    }));
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("hides itself when there is only one lesson", () => {
    const {
      container,
    } = render(
      <LessonFilterChips
        lessons={[{
          slug: "a",
          title: "Lesson A",
        }]}
        value="all"
        onChange={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

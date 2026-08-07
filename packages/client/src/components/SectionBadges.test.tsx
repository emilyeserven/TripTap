import type { BookmarkSectionRef } from "@sentence-bank/types";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SectionBadges } from "./SectionBadges";

function section(over: Partial<BookmarkSectionRef> & { id: string;
  label: string; }): BookmarkSectionRef {
  return {
    type: "page",
    startValue: null,
    endValue: null,
    ...over,
  };
}

describe("SectionBadges", () => {
  it("renders nothing when there are no sections", () => {
    const {
      container,
    } = render(<SectionBadges sections={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a prefixed pill per section", () => {
    render(
      <SectionBadges
        sections={[
          section({
            id: "a",
            label: "03 サリーさんの国もイギリスです",
          }),
          section({
            id: "b",
            label: "04 あ、そうですか",
          }),
        ]}
      />,
    );
    expect(screen.getByText("§ 03 サリーさんの国もイギリスです")).toBeTruthy();
    expect(screen.getByText("§ 04 あ、そうですか")).toBeTruthy();
  });
});

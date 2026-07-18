import type { BookmarkSectionNode, BookmarkSectionRef } from "@sentence-bank/types";

import { useState } from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BookmarkSectionSelect } from "./BookmarkSectionSelect";

function node(over: Partial<BookmarkSectionNode> & { id: string;
  name: string; }): BookmarkSectionNode {
  return {
    parentId: null,
    type: "name",
    startValue: null,
    endValue: null,
    url: null,
    tagIds: [],
    ...over,
  };
}

// Chapter 1 (has a child lesson); Reasons is a top-level leaf.
const NODES: BookmarkSectionNode[] = [
  node({
    id: "ch1",
    name: "Chapter 1",
  }),
  node({
    id: "reasons",
    name: "Reasons",
  }),
  node({
    id: "l1",
    name: "Lesson 1",
    parentId: "ch1",
    type: "page",
    startValue: "12",
  }),
];

/** Controlled wrapper so the deepest pick flows back in as `value`. */
function Harness({
  onRef,
}: { onRef?: (ref: BookmarkSectionRef | null) => void }) {
  const [value, setValue] = useState("");
  return (
    <BookmarkSectionSelect
      nodes={NODES}
      value={value}
      onChange={(ref) => {
        setValue(ref?.id ?? "");
        onRef?.(ref);
      }}
    />
  );
}

describe("BookmarkSectionSelect", () => {
  it("reveals a sub-section combobox after picking a parent, then stops at a leaf", () => {
    const refs: (BookmarkSectionRef | null)[] = [];
    render(<Harness onRef={r => refs.push(r)} />);
    expect(screen.getAllByRole("combobox")).toHaveLength(1);

    // Pick "Chapter 1" (has a child) → a second combobox appears.
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByText("Chapter 1"));
    expect(screen.getAllByRole("combobox")).toHaveLength(2);

    // Drill into "Lesson 1" (a leaf) → still two comboboxes, and the ref carries the breadcrumb + page.
    fireEvent.click(screen.getByRole("combobox", {
      name: "Section — sub-section 1",
    }));
    fireEvent.click(screen.getByText("Lesson 1"));
    expect(screen.getAllByRole("combobox")).toHaveLength(2);
    const last = refs.at(-1);
    expect(last?.id).toBe("l1");
    expect(last?.label).toBe("Chapter 1 › Lesson 1");
    expect(last?.type).toBe("page");
    expect(last?.startValue).toBe("12");
  });

  it("keeps a single combobox when a top-level leaf is picked", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByText("Reasons"));
    expect(screen.getAllByRole("combobox")).toHaveLength(1);
  });

  it("resets the deeper level when a higher level changes", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByText("Chapter 1"));
    expect(screen.getAllByRole("combobox")).toHaveLength(2);

    fireEvent.click(screen.getByRole("combobox", {
      name: "Section",
    }));
    fireEvent.click(screen.getByText("Reasons"));
    expect(screen.getAllByRole("combobox")).toHaveLength(1);
  });

  it("clears the reference when picking 'Whole bookmark'", () => {
    const refs: (BookmarkSectionRef | null)[] = [];
    render(<Harness onRef={r => refs.push(r)} />);
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByText("Chapter 1"));
    fireEvent.click(screen.getByRole("combobox", {
      name: "Section",
    }));
    fireEvent.click(screen.getByText("Whole bookmark (no section)"));
    expect(refs.at(-1)).toBeNull();
    expect(screen.getAllByRole("combobox")).toHaveLength(1);
  });
});

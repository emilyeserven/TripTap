import type { TagTermOption } from "@sentence-bank/types";

import { useState } from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TagTreeSelect } from "./TagTreeSelect";

// Mirrors the real Grammar tree: Grammar(root) → Verbs → Potential Form; し - Reasons is a leaf.
const NODES: TagTermOption[] = [
  {
    id: "verbs",
    name: "Verbs",
    parentId: "root",
  },
  {
    id: "shi",
    name: "し - Reasons",
    parentId: "root",
  },
  {
    id: "pf",
    name: "Potential Form",
    parentId: "verbs",
  },
];

/** Controlled wrapper so the deepest pick flows back in as `value`. */
function Harness() {
  const [value, setValue] = useState("");
  return (
    <TagTreeSelect
      nodes={NODES}
      rootId="root"
      value={value}
      onChange={id => setValue(id)}
      placeholder="Pick a grammar tag…"
      ariaLabel="Grammar tag"
    />
  );
}

describe("TagTreeSelect", () => {
  it("reveals a subtag combobox after picking a parent, then stops at a leaf", () => {
    render(<Harness />);
    // Only the root-level combobox at first.
    expect(screen.getAllByRole("combobox")).toHaveLength(1);

    // Pick "Verbs" (has a subtag) → a second combobox appears.
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByText("Verbs"));
    expect(screen.getAllByRole("combobox")).toHaveLength(2);

    // Drill into "Potential Form" (a leaf) → still two comboboxes, no third.
    fireEvent.click(screen.getByRole("combobox", {
      name: "Grammar tag — subtag 1",
    }));
    fireEvent.click(screen.getByText("Potential Form"));
    expect(screen.getAllByRole("combobox")).toHaveLength(2);
    expect(screen.getByRole("combobox", {
      name: "Grammar tag",
    })).toHaveTextContent("Verbs");
  });

  it("keeps a single combobox when a leaf is picked at the top level", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByText("し - Reasons"));
    // し - Reasons has no children → no subtag combobox.
    expect(screen.getAllByRole("combobox")).toHaveLength(1);
  });

  it("resets the deeper level when a higher level changes", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByText("Verbs"));
    expect(screen.getAllByRole("combobox")).toHaveLength(2);

    // Switch the top level to the leaf → the subtag combobox disappears.
    fireEvent.click(screen.getByRole("combobox", {
      name: "Grammar tag",
    }));
    fireEvent.click(screen.getByText("し - Reasons"));
    expect(screen.getAllByRole("combobox")).toHaveLength(1);
  });
});

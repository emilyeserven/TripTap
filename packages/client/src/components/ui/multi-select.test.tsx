import { useState } from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MultiSelect } from "./multi-select";

const OPTIONS = [
  {
    value: "a",
    label: "Alpha",
  },
  {
    value: "b",
    label: "Beta",
  },
  {
    value: "c",
    label: "Gamma",
  },
];

/** Controlled wrapper so selection changes are reflected back into the component under test. */
function Harness({
  single = false,
}: { single?: boolean }) {
  const [value, setValue] = useState<string[]>([]);
  return (
    <MultiSelect
      value={value}
      onChange={setValue}
      options={OPTIONS}
      single={single}
      placeholder="Add…"
    />
  );
}

describe("MultiSelect", () => {
  it("toggles multiple options and renders removable badges", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByText("Alpha"));
    fireEvent.click(screen.getByText("Gamma"));

    // Both selected options appear as removable badges.
    expect(screen.getByRole("button", {
      name: "Remove Alpha",
    })).toBeInTheDocument();
    expect(screen.getByRole("button", {
      name: "Remove Gamma",
    })).toBeInTheDocument();

    // Removing one drops just that badge.
    fireEvent.click(screen.getByRole("button", {
      name: "Remove Alpha",
    }));
    expect(screen.queryByRole("button", {
      name: "Remove Alpha",
    })).not.toBeInTheDocument();
    expect(screen.getByRole("button", {
      name: "Remove Gamma",
    })).toBeInTheDocument();
  });

  it("caps selection to one when single", () => {
    render(<Harness single />);
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByText("Alpha"));
    // Popover closes after a single-select pick; reopen and choose another.
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByText("Beta"));

    expect(screen.queryByRole("button", {
      name: "Remove Alpha",
    })).not.toBeInTheDocument();
    expect(screen.getByRole("button", {
      name: "Remove Beta",
    })).toBeInTheDocument();
  });
});

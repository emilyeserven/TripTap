import type { CorrectionImportCandidate } from "@sentence-bank/types";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CorrectionImportDialog } from "./CorrectionImportDialog";

function candidate(id: string, corrected: string): CorrectionImportCandidate {
  return {
    ref: {
      kind: "my_sentence",
      id,
    },
    original: `orig ${id}`,
    corrected,
    correctorNote: null,
    context: null,
    label: null,
    grammarTerms: [],
  };
}

const CANDIDATES = [candidate("a", "猫がいます。"), candidate("b", "犬もいます。")];

vi.mock("@/hooks/useCorrections", () => ({
  useImportCandidates: () => ({
    data: CANDIDATES,
    isLoading: false,
  }),
  useImportCorrections: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

function openDialog() {
  render(<CorrectionImportDialog />);
  fireEvent.click(screen.getByRole("button", {
    name: /Import from/,
  }));
}

describe("CorrectionImportDialog select all", () => {
  it("selects every candidate, then clears on a second click", () => {
    openDialog();
    expect(screen.getByText("0 selected")).toBeInTheDocument();

    const selectAll = screen.getByLabelText("Select all");
    fireEvent.click(selectAll);
    expect(screen.getByText("2 selected")).toBeInTheDocument();

    fireEvent.click(selectAll);
    expect(screen.getByText("0 selected")).toBeInTheDocument();
  });

  it("reflects all-selected state when items are picked individually", () => {
    openDialog();
    // The header checkbox + two item checkboxes.
    const [selectAll] = screen.getAllByLabelText("Select all");
    expect((selectAll as HTMLButtonElement).getAttribute("data-state")).toBe("unchecked");

    fireEvent.click(selectAll);
    expect((selectAll as HTMLButtonElement).getAttribute("data-state")).toBe("checked");
  });
});

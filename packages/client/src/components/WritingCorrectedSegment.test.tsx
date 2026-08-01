import type { WritingCorrection } from "@sentence-bank/types";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WritingCorrectedSegment } from "./WritingCorrectedSegment";

// The corrected segment links to My Sentences and embeds a query-backed meaning editor; neither is
// what these tests are about, so both are stubbed out.
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
  }: { children: React.ReactNode }) => <a href="#stub">{children}</a>,
}));
vi.mock("@/components/WritingCorrectionMeaning", () => ({
  WritingCorrectionMeaning: () => null,
}));

function correction(over: Partial<WritingCorrection> = {}): WritingCorrection {
  return {
    id: "c1",
    original: "猫がいる。",
    corrected: "猫がいます。",
    note: null,
    marks: null,
    mySentenceId: null,
    ...over,
  };
}

function renderSegment(over: Partial<WritingCorrection> = {}) {
  return render(
    <WritingCorrectedSegment
      correction={correction(over)}
      language="Japanese"
      editing={false}
      onStartEdit={vi.fn()}
      onSaveEdit={vi.fn()}
    />,
  );
}

describe("WritingCorrectedSegment", () => {
  it("leads with the corrected sentence and keeps the diff behind the toggle", () => {
    renderSegment();
    expect(screen.getByText("猫がいます。")).toBeInTheDocument();
    expect(screen.queryByLabelText("Diff of your sentence against the correction")).toBeNull();

    fireEvent.click(screen.getByRole("button", {
      name: /show your original/i,
    }));
    expect(screen.getByLabelText("Diff of your sentence against the correction")).toBeInTheDocument();
  });

  it("marks a no-change entry as such and offers no diff", () => {
    renderSegment({
      corrected: "",
    });
    expect(screen.getByText("No changes needed")).toBeInTheDocument();
    expect(screen.getByText("猫がいる。")).toBeInTheDocument();
    expect(screen.queryByRole("button", {
      name: /show your original/i,
    })).toBeNull();
  });

  it("underlines a phrase the note refers to", () => {
    const {
      container,
    } = renderSegment({
      note: "います: polite form",
    });
    const triggers = container.querySelectorAll("[data-slot=\"hover-card-trigger\"]");
    expect(triggers).toHaveLength(1);
    expect(triggers[0].textContent).toBe("います");
  });

  it("resolves a note's phrases against the original when nothing changed", () => {
    const {
      container,
    } = renderSegment({
      corrected: "",
      note: "いる: plain form is fine here",
    });
    const triggers = container.querySelectorAll("[data-slot=\"hover-card-trigger\"]");
    expect(triggers).toHaveLength(1);
    expect(triggers[0].textContent).toBe("いる");
  });
});

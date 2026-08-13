import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MySentenceView } from "./MySentenceView";

import { renderWithQuery } from "@/test-utils/renderWithQuery";
import { makeSentence } from "@/test-utils/sentence";

// The real corrector is a TipTap editor, which needs a layout engine jsdom doesn't have. The branch
// under test is only *whether* it is offered, so a marker stands in for it.
vi.mock("@/components/SentenceCorrector", () => ({
  SentenceCorrector: () => <div data-testid="corrector" />,
}));

function mine(over: Parameters<typeof makeSentence>[0] = {}) {
  return makeSentence({
    kind: "mine",
    text: "私は学生だ。",
    ...over,
  });
}

describe("MySentenceView", () => {
  it("offers the corrector for a sentence flagged as needing correction", () => {
    renderWithQuery(
      <MySentenceView
        mySentence={mine({
          needsCorrection: true,
        })}
      />,
    );

    expect(screen.getByTestId("corrector")).toBeInTheDocument();
    expect(screen.getByText("Needs correction")).toBeInTheDocument();
  });

  it("offers the corrector for an un-flagged sentence that has no correction yet", () => {
    renderWithQuery(
      <MySentenceView
        mySentence={mine({
          needsCorrection: false,
        })}
      />,
    );

    expect(screen.getByTestId("corrector")).toBeInTheDocument();
    // Nothing was corrected, so it must not claim to have been.
    expect(screen.queryByText("Corrected")).not.toBeInTheDocument();
    expect(screen.getByText("No correction")).toBeInTheDocument();
  });

  it("shows the corrected sentence instead of the corrector once a correction is saved", () => {
    renderWithQuery(
      <MySentenceView
        mySentence={mine({
          needsCorrection: true,
          correction: "私は学生です。",
        })}
      />,
    );

    expect(screen.queryByTestId("corrector")).not.toBeInTheDocument();
    expect(screen.getByText("私は学生です。")).toBeInTheDocument();
    expect(screen.getByText("Corrected")).toBeInTheDocument();
  });

  it("leaves the explanation to the corrector while correcting, and shows it once corrected", () => {
    const explanation = "だ is too blunt here.";

    const {
      unmount,
    } = renderWithQuery(
      <MySentenceView
        mySentence={mine({
          explanation,
        })}
      />,
    );
    expect(screen.queryByText(explanation)).not.toBeInTheDocument();
    unmount();

    renderWithQuery(
      <MySentenceView
        mySentence={mine({
          explanation,
          correction: "私は学生です。",
        })}
      />,
    );
    expect(screen.getByText(explanation)).toBeInTheDocument();
  });
});

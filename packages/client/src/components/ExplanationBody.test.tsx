import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ExplanationBody } from "./ExplanationBody";

const SENTENCE = "昨日は友達と映画を見ました。";

describe("ExplanationBody", () => {
  it("renders nothing when there is no explanation", () => {
    const {
      container,
    } = render(
      <ExplanationBody
        explanation={null}
        target={SENTENCE}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders prose as Markdown", () => {
    render(
      <ExplanationBody
        explanation="The tense is **wrong**."
        target={SENTENCE}
      />,
    );
    expect(screen.getByText("wrong").tagName).toBe("STRONG");
  });

  it("keeps two reference lines from collapsing into one paragraph", () => {
    render(
      <ExplanationBody
        explanation={"映画: the film\n友達: friend"}
        target={SENTENCE}
      />,
    );
    // Both phrases survive as their own rows — a single Markdown paragraph would merge the lines.
    expect(screen.getByText("映画")).toBeInTheDocument();
    expect(screen.getByText("友達")).toBeInTheDocument();
    expect(screen.getByText("the film")).toBeInTheDocument();
    expect(screen.getByText("friend")).toBeInTheDocument();
  });

  it("renders Markdown inside a reference note", () => {
    render(
      <ExplanationBody
        explanation="映画: means **film**"
        target={SENTENCE}
      />,
    );
    expect(screen.getByText("film").tagName).toBe("STRONG");
  });

  it("keeps references and prose in the order they were written", () => {
    const {
      container,
    } = render(
      <ExplanationBody
        explanation={"Overall good.\n映画: the film\nWatch the tense."}
        target={SENTENCE}
      />,
    );
    const text = container.textContent ?? "";
    expect(text.indexOf("Overall good.")).toBeLessThan(text.indexOf("映画"));
    expect(text.indexOf("映画")).toBeLessThan(text.indexOf("Watch the tense."));
  });
});

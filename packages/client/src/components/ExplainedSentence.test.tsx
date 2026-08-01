import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ExplainedSentence } from "./ExplainedSentence";

const SENTENCE = "昨日は友達と映画を見ました。";

function triggers(container: HTMLElement) {
  return container.querySelectorAll("[data-slot=\"hover-card-trigger\"]");
}

describe("ExplainedSentence", () => {
  it("renders the sentence unchanged when there is no explanation", () => {
    const {
      container,
    } = render(
      <ExplainedSentence
        text={SENTENCE}
        explanation={null}
      />,
    );
    expect(container.textContent).toBe(SENTENCE);
    expect(triggers(container)).toHaveLength(0);
  });

  it("adds no reference when the explanation is ordinary prose", () => {
    const {
      container,
    } = render(
      <ExplainedSentence
        text={SENTENCE}
        explanation="Note: watch the tense here."
      />,
    );
    expect(container.textContent).toBe(SENTENCE);
    expect(triggers(container)).toHaveLength(0);
  });

  it("underlines the referenced phrase without altering the sentence text", () => {
    const {
      container,
    } = render(
      <ExplainedSentence
        text={SENTENCE}
        explanation="見ました: past tense — 〜ました, not 〜ます"
      />,
    );
    expect(container.textContent).toBe(SENTENCE);
    const found = triggers(container);
    expect(found).toHaveLength(1);
    expect(found[0].textContent).toBe("見ました");
  });

  it("underlines every occurrence of a phrase", () => {
    const {
      container,
    } = render(
      <ExplainedSentence
        text="はははは"
        explanation="は: topic marker"
      />,
    );
    expect(triggers(container)).toHaveLength(4);
  });

  it("keeps the note out of the document until the reference is interacted with", () => {
    render(
      <ExplainedSentence
        text={SENTENCE}
        explanation="友達: friend"
      />,
    );
    expect(screen.queryByText("friend")).toBeNull();
  });
});

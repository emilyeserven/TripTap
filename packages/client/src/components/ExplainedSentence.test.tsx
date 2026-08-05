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

  it("highlights the span whose snippet is being hovered elsewhere", () => {
    const {
      container,
    } = render(
      <ExplainedSentence
        text={SENTENCE}
        explanation="友達: friend"
        highlightSnippet="友達"
      />,
    );
    const [trigger] = triggers(container);
    expect(trigger.className).toContain("bg-primary/15");
  });

  it("does not highlight when the hovered snippet is a different phrase", () => {
    const {
      container,
    } = render(
      <ExplainedSentence
        text={SENTENCE}
        explanation="友達: friend"
        highlightSnippet="映画"
      />,
    );
    const [trigger] = triggers(container);
    expect(trigger.className).not.toContain("bg-primary/15");
  });
});

describe("ExplainedSentence furigana", () => {
  /** 昨日(きのう)は友達(ともだち)と映画(えいが)を見(み)ました。 */
  const READING = [
    {
      t: "昨日",
      r: "きのう",
    },
    {
      t: "は",
      r: null,
    },
    {
      t: "友達",
      r: "ともだち",
    },
    {
      t: "と",
      r: null,
    },
    {
      t: "映画",
      r: "えいが",
    },
    {
      t: "を",
      r: null,
    },
    {
      t: "見",
      r: "み",
    },
    {
      t: "ました。",
      r: null,
    },
  ];

  it("renders ruby without altering the sentence text", () => {
    const {
      container,
    } = render(
      <ExplainedSentence
        text={SENTENCE}
        explanation={null}
        reading={READING}
      />,
    );
    // The visible characters are unchanged; the readings are additive <rt> content.
    expect(container.querySelector("p")?.textContent).toContain(SENTENCE.slice(0, 2));
    expect(container.querySelectorAll("ruby").length).toBeGreaterThan(0);
    expect([...container.querySelectorAll("rt")].map(rt => rt.textContent)).toContain("きのう");
  });

  it("keeps ruby on a referenced phrase, so a hover card and furigana coexist", () => {
    const {
      container,
    } = render(
      <ExplainedSentence
        text={SENTENCE}
        explanation="友達: the person you went with"
        reading={READING}
      />,
    );
    expect(triggers(container)).toHaveLength(1);
    const trigger = triggers(container)[0] as HTMLElement;
    expect(trigger.textContent).toContain("友達");
    // The referenced run carries its own slice of the readings rather than losing them.
    expect([...trigger.querySelectorAll("rt")].map(rt => rt.textContent)).toContain("ともだち");
  });

  it("renders plain when no reading is supplied", () => {
    const {
      container,
    } = render(
      <ExplainedSentence
        text={SENTENCE}
        explanation="友達: note"
      />,
    );
    expect(container.querySelectorAll("ruby")).toHaveLength(0);
    expect(container.textContent).toBe(SENTENCE);
  });
});

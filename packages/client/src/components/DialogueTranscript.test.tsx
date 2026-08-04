import type { DialogueLine } from "@sentence-bank/types";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DialogueTranscript } from "./DialogueTranscript";

function line(
  id: string,
  speaker: string | null,
  text: string,
  extra: { translation?: string;
    hint?: string; } = {},
): DialogueLine {
  return {
    id,
    speaker,
    text,
    reading: null,
    readingError: null,
    translation: extra.translation ?? null,
    hint: extra.hint ?? null,
  };
}

const LINES = [
  line("1", "田中さん", "こんにちは、元気ですか？"),
  line("2", "私", "はい、元気です。"),
  line("3", "中村さん", "はい。"),
];

/** The bubble element for a line, found via the text it contains. */
function bubbleFor(text: string): HTMLElement {
  return screen.getByText(text).closest("[data-slot='chat-bubble']") as HTMLElement;
}

describe("DialogueTranscript", () => {
  it("puts the learner on the right and everyone else on the left", () => {
    render(<DialogueTranscript lines={LINES} />);

    expect(bubbleFor("はい、元気です。").dataset.variant).toBe("sent");
    expect(bubbleFor("こんにちは、元気ですか？").dataset.variant).toBe("received");
    expect(bubbleFor("はい。").dataset.variant).toBe("received");
  });

  it("labels each bubble with its speaker, in order", () => {
    const {
      container,
    } = render(<DialogueTranscript lines={LINES} />);

    const captions = [...container.querySelectorAll("[data-slot='chat-bubble-caption']")];
    expect(captions.map(el => el.textContent)).toEqual(["田中さん", "私", "中村さん"]);
  });

  it("treats a dialogue's own selfSpeakers as the learner too", () => {
    render(
      <DialogueTranscript
        lines={[line("1", "エミリー", "そうですね。")]}
        selfSpeakers={["エミリー"]}
      />,
    );

    expect(bubbleFor("そうですね。").dataset.variant).toBe("sent");
  });

  it("hides a speaker's lines until each is individually revealed", () => {
    render(
      <DialogueTranscript
        lines={LINES}
        hiddenSpeakers={["私", "中村さん"]}
      />,
    );

    // The hidden text is genuinely absent, not merely obscured.
    expect(screen.queryByText("はい、元気です。")).not.toBeInTheDocument();
    expect(screen.queryByText("はい。")).not.toBeInTheDocument();
    expect(screen.getByText("こんにちは、元気ですか？")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", {
      name: "Reveal 私's line",
    }));

    expect(screen.getByText("はい、元気です。")).toBeInTheDocument();
    // Revealing one line leaves the other hidden speaker alone.
    expect(screen.queryByText("はい。")).not.toBeInTheDocument();
  });

  it("reveals a hidden line from the keyboard", () => {
    render(
      <DialogueTranscript
        lines={LINES}
        hiddenSpeakers={["私"]}
      />,
    );

    fireEvent.keyDown(screen.getByRole("button", {
      name: "Reveal 私's line",
    }), {
      key: "Enter",
    });

    expect(screen.getByText("はい、元気です。")).toBeInTheDocument();
  });

  it("re-hides revealed lines when the hidden set changes", () => {
    const {
      rerender,
    } = render(
      <DialogueTranscript
        lines={LINES}
        hiddenSpeakers={["私"]}
      />,
    );

    fireEvent.click(screen.getByRole("button", {
      name: "Reveal 私's line",
    }));
    expect(screen.getByText("はい、元気です。")).toBeInTheDocument();

    // Un-hide, then hide again — the answer should not still be showing.
    rerender(
      <DialogueTranscript
        lines={LINES}
        hiddenSpeakers={[]}
      />,
    );
    rerender(
      <DialogueTranscript
        lines={LINES}
        hiddenSpeakers={["私"]}
      />,
    );

    expect(screen.queryByText("はい、元気です。")).not.toBeInTheDocument();
  });

  it("renders an unattributed line as narration, with no bubble", () => {
    render(<DialogueTranscript lines={[line("1", null, "（電話が鳴る）")]} />);

    expect(screen.getByText("（電話が鳴る）")).toBeInTheDocument();
    expect(screen.queryByText("（電話が鳴る）")
      ?.closest("[data-slot='chat-bubble']")).toBeNull();
  });

  it("blurs translations until they are turned on", () => {
    const withTranslation = [line("1", "田中さん", "こんにちは", {
      translation: "Hello",
    })];
    const {
      rerender,
    } = render(<DialogueTranscript lines={withTranslation} />);

    expect(screen.getByText("Hello").className).toContain("blur-[3px]");

    rerender(
      <DialogueTranscript
        lines={withTranslation}
        showTranslations
      />,
    );
    expect(screen.getByText("Hello").className).not.toContain("blur-[3px]");
  });

  it("prompts for a script when there is nothing to show", () => {
    render(<DialogueTranscript lines={null} />);

    expect(screen.getByText(/Nothing to show yet/)).toBeInTheDocument();
  });

  it("shows a hidden line's hint in place of the words", () => {
    render(
      <DialogueTranscript
        lines={[
          line("1", "田中さん", "こんにちは、元気ですか？"),
          line("2", "私", "はい、元気です。", {
            hint: "say you're fine and ask back",
          }),
        ]}
        hiddenSpeakers={["私"]}
      />,
    );

    // The hint stands in for the line, so the learner knows what the turn is for...
    expect(screen.getByText("say you're fine and ask back")).toBeInTheDocument();
    // ...without the words themselves being anywhere in the DOM.
    expect(screen.queryByText("はい、元気です。")).not.toBeInTheDocument();
  });

  it("falls back to dots for a hidden line with no hint", () => {
    render(
      <DialogueTranscript
        lines={[line("1", "私", "はい、元気です。")]}
        hiddenSpeakers={["私"]}
      />,
    );

    expect(screen.getByRole("button", {
      name: "Reveal 私's line",
    }).textContent).toBe("•••");
  });

  it("names the hint in the reveal button's label, for screen readers", () => {
    render(
      <DialogueTranscript
        lines={[line("1", "私", "はい。", {
          hint: "agree",
        })]}
        hiddenSpeakers={["私"]}
      />,
    );

    expect(screen.getByRole("button", {
      name: "Reveal 私's line — agree",
    })).toBeInTheDocument();
  });

  it("revealing a hinted line swaps the hint for the words", () => {
    render(
      <DialogueTranscript
        lines={[line("1", "私", "はい、元気です。", {
          hint: "say you're fine",
        })]}
        hiddenSpeakers={["私"]}
      />,
    );

    fireEvent.click(screen.getByRole("button", {
      name: /^Reveal 私's line/,
    }));

    expect(screen.getByText("はい、元気です。")).toBeInTheDocument();
    expect(screen.queryByText("say you're fine")).not.toBeInTheDocument();
  });

  it("keeps a hint out of the way while the line is visible", () => {
    render(
      <DialogueTranscript
        lines={[line("1", "私", "はい。", {
          hint: "agree",
        })]}
      />,
    );

    expect(screen.queryByText("agree")).not.toBeInTheDocument();
  });
});

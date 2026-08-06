import type { DialogueLine } from "@sentence-bank/types";

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { speak } from "./ai-lesson/speak";
import { DialogueStepper } from "./DialogueStepper";

vi.mock("./ai-lesson/speak", () => ({
  speak: vi.fn(),
}));

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

/** The stepped line's wrapper — the element the fade class lands on. */
function wrapperFor(text: string): HTMLElement {
  return screen.getByText(text).closest("[data-slot='chat-bubble']")
    ?.parentElement as HTMLElement;
}

function advance(): void {
  fireEvent.click(screen.getByRole("button", {
    name: "Next line",
  }));
}

function back(): void {
  fireEvent.click(screen.getByRole("button", {
    name: "Back",
  }));
}

/** One recorded `Element.animate()` call: which bubble moved, and how. */
interface Move { line: string;
  keyframes: Keyframe[]; }

let moves: Move[] = [];

/** The keyframes the step animation gave a line. Fails the test if the line wasn't animated at all. */
function moveOf(id: string): Keyframe[] {
  const move = moves.find(m => m.line === id);
  if (!move) throw new Error(`line ${id} was not animated (moved: ${moves.map(m => m.line).join(", ") || "none"})`);
  return move.keyframes;
}

/** The px offset an animation starts from — positive means it rises into place. */
function startsAt(keyframes: Keyframe[]): number {
  const [{
    transform,
  }] = keyframes;
  return Number(/-?\d+(\.\d+)?/.exec(String(transform ?? ""))?.[0] ?? 0);
}

beforeAll(() => {
  // jsdom has no layout and no Web Animations API, so the motion hook needs both faked: `offsetTop`
  // by slot position (a bubble in the prior slot sits 100px above the current one), and `animate` as
  // a recorder, since what matters is which bubble was asked to move and from where.
  Object.defineProperty(HTMLElement.prototype, "offsetTop", {
    configurable: true,
    get(this: HTMLElement) {
      const siblings = [...(this.parentElement?.children ?? [])];
      return Math.max(0, siblings.indexOf(this)) * 100;
    },
  });
  HTMLElement.prototype.getAnimations = () => [];
  HTMLElement.prototype.animate = function record(this: HTMLElement, keyframes) {
    moves.push({
      line: this.dataset.dialogueLine ?? "",
      keyframes: keyframes as Keyframe[],
    });
    return {
      cancel() {
        // The recorder has nothing to stop.
      },
    } as Animation;
  };
});

describe("DialogueStepper", () => {
  beforeEach(() => {
    vi.mocked(speak).mockClear();
    moves = [];
  });

  it("starts on the first line only", () => {
    render(<DialogueStepper lines={LINES} />);

    expect(screen.getByText("こんにちは、元気ですか？")).toBeInTheDocument();
    expect(screen.queryByText("はい、元気です。")).not.toBeInTheDocument();
    expect(screen.queryByText("はい。")).not.toBeInTheDocument();
    expect(screen.getByText("Line 1 of 3")).toBeInTheDocument();
  });

  it("advances to the next line, fading the prior one", () => {
    render(<DialogueStepper lines={LINES} />);
    advance();

    expect(screen.getByText("Line 2 of 3")).toBeInTheDocument();
    expect(screen.getByText("はい、元気です。")).toBeInTheDocument();
    expect(wrapperFor("こんにちは、元気ですか？").className).toContain("opacity-40");
    expect(wrapperFor("はい、元気です。").className).not.toContain("opacity-40");
    expect(screen.queryByText("はい。")).not.toBeInTheDocument();
  });

  it("drops a line entirely once it is two steps back", () => {
    render(<DialogueStepper lines={LINES} />);
    advance();
    advance();

    expect(screen.queryByText("こんにちは、元気ですか？")).not.toBeInTheDocument();
    expect(screen.getByText("はい。")).toBeInTheDocument();
  });

  it("offers Start over on the last line and resets from it", () => {
    render(<DialogueStepper lines={LINES} />);
    advance();
    advance();

    expect(screen.queryByRole("button", {
      name: "Next line",
    })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", {
      name: "Start over",
    }));
    expect(screen.getByText("Line 1 of 3")).toBeInTheDocument();
    expect(screen.getByText("こんにちは、元気ですか？")).toBeInTheDocument();
  });

  it("steps back with the Back button, which is disabled at the start", () => {
    render(<DialogueStepper lines={LINES} />);

    const back = screen.getByRole("button", {
      name: "Back",
    });
    expect(back).toBeDisabled();

    advance();
    fireEvent.click(back);
    expect(screen.getByText("Line 1 of 3")).toBeInTheDocument();
  });

  it("reads a non-self line aloud when autoRead is on", () => {
    render(
      <DialogueStepper
        lines={LINES}
        autoRead
      />,
    );

    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak).toHaveBeenCalledWith("こんにちは、元気ですか？");
  });

  it("stays silent on the learner's own lines, then reads the next non-self line", () => {
    render(
      <DialogueStepper
        lines={LINES}
        autoRead
      />,
    );
    vi.mocked(speak).mockClear();

    advance();
    expect(speak).not.toHaveBeenCalled();

    advance();
    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak).toHaveBeenCalledWith("はい。");
  });

  it("treats a dialogue's own selfSpeakers as the learner too", () => {
    render(
      <DialogueStepper
        lines={[line("1", "エミリー", "そうですね。")]}
        selfSpeakers={["エミリー"]}
        autoRead
      />,
    );

    expect(speak).not.toHaveBeenCalled();
  });

  it("never speaks with autoRead off", () => {
    render(<DialogueStepper lines={LINES} />);
    advance();
    advance();

    expect(speak).not.toHaveBeenCalled();
  });

  it("never reads a narration line", () => {
    render(
      <DialogueStepper
        lines={[line("1", null, "（電話が鳴る）")]}
        autoRead
      />,
    );

    expect(speak).not.toHaveBeenCalled();
  });

  it("reads the current non-self line when autoRead turns on mid-run", () => {
    const {
      rerender,
    } = render(<DialogueStepper lines={LINES} />);
    expect(speak).not.toHaveBeenCalled();

    rerender(
      <DialogueStepper
        lines={LINES}
        autoRead
      />,
    );
    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak).toHaveBeenCalledWith("こんにちは、元気ですか？");
  });

  it("hides a hidden speaker's line until it is revealed", () => {
    render(
      <DialogueStepper
        lines={LINES}
        hiddenSpeakers={["私"]}
      />,
    );
    advance();

    expect(screen.queryByText("はい、元気です。")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", {
      name: "Reveal 私's line",
    }));
    expect(screen.getByText("はい、元気です。")).toBeInTheDocument();
  });

  it("shows a hidden line's hint in place of the words", () => {
    render(
      <DialogueStepper
        lines={[line("1", "私", "はい、元気です。", {
          hint: "say you're fine",
        })]}
        hiddenSpeakers={["私"]}
      />,
    );

    expect(screen.getByText("say you're fine")).toBeInTheDocument();
    expect(screen.queryByText("はい、元気です。")).not.toBeInTheDocument();
  });

  it("keeps a hidden line hidden once it slides into the prior slot", () => {
    render(
      <DialogueStepper
        lines={LINES}
        hiddenSpeakers={["私"]}
      />,
    );
    advance();
    advance();

    expect(screen.queryByText("はい、元気です。")).not.toBeInTheDocument();
    expect(screen.getByRole("button", {
      name: "Reveal 私's line",
    })).toBeInTheDocument();
  });

  it("re-hides revealed lines when the hidden set changes", () => {
    const {
      rerender,
    } = render(
      <DialogueStepper
        lines={[line("1", "私", "はい、元気です。")]}
        hiddenSpeakers={["私"]}
      />,
    );

    fireEvent.click(screen.getByRole("button", {
      name: "Reveal 私's line",
    }));
    expect(screen.getByText("はい、元気です。")).toBeInTheDocument();

    rerender(
      <DialogueStepper
        lines={[line("1", "私", "はい、元気です。")]}
        hiddenSpeakers={[]}
      />,
    );
    rerender(
      <DialogueStepper
        lines={[line("1", "私", "はい、元気です。")]}
        hiddenSpeakers={["私"]}
      />,
    );

    expect(screen.queryByText("はい、元気です。")).not.toBeInTheDocument();
  });

  it("waits for the reveal before reading a hidden line aloud", () => {
    render(
      <DialogueStepper
        lines={LINES}
        hiddenSpeakers={["田中さん"]}
        autoRead
      />,
    );

    // Speaking a hidden line would hand over the answer the learner is meant to produce.
    expect(speak).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", {
      name: "Reveal 田中さん's line",
    }));
    expect(speak).toHaveBeenCalledWith("こんにちは、元気ですか？");
  });

  it("keeps the on-screen line's node when it steps into the prior slot", () => {
    render(<DialogueStepper lines={LINES} />);
    advance();
    const wasCurrent = wrapperFor("はい、元気です。");

    advance();

    // The anti-flash guarantee: a line the learner is already reading must keep its element. Rebuild
    // it and it restarts from `opacity: 0`, which is a blink on every step.
    expect(wrapperFor("はい、元気です。")).toBe(wasCurrent);
  });

  it("glides the line that is already on screen, without touching its opacity", () => {
    render(<DialogueStepper lines={LINES} />);
    advance();
    moves = [];
    advance();

    // Line 2 moves from the current slot to the prior one — 100px up, in the faked layout.
    const glide = moveOf("2");
    expect(startsAt(glide)).toBe(100);
    // Transform only. Animating its opacity is what made it flash.
    expect(glide.some(frame => "opacity" in frame)).toBe(false);
  });

  it("fades a newly arrived line in from below when advancing", () => {
    render(<DialogueStepper lines={LINES} />);
    moves = [];
    advance();

    const enter = moveOf("2");
    expect(enter[0].opacity).toBe("0");
    expect(startsAt(enter)).toBeGreaterThan(0);
  });

  it("fades a newly arrived line in from above when stepping back", () => {
    render(<DialogueStepper lines={LINES} />);
    advance();
    advance();
    moves = [];
    back();

    // Line 1 re-enters the window from above, since that is the direction of travel.
    expect(startsAt(moveOf("1"))).toBeLessThan(0);
  });

  it("travels backwards on Start over", () => {
    render(<DialogueStepper lines={LINES} />);
    advance();
    advance();
    moves = [];
    fireEvent.click(screen.getByRole("button", {
      name: "Start over",
    }));

    expect(startsAt(moveOf("1"))).toBeLessThan(0);
  });

  it("does not animate when a hidden line is revealed", () => {
    render(
      <DialogueStepper
        lines={LINES}
        hiddenSpeakers={["私"]}
      />,
    );
    advance();
    moves = [];

    fireEvent.click(screen.getByRole("button", {
      name: "Reveal 私's line",
    }));

    // Revealing is not a step. Moving the transcript under the learner's own click would read as a
    // flash, so a re-render that isn't a step animates nothing.
    expect(moves).toEqual([]);
  });

  it("renders nothing for an empty dialogue", () => {
    const {
      container,
    } = render(<DialogueStepper lines={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});

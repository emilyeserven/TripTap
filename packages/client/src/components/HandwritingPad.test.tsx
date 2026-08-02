import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { HandwritingPad } from "./HandwritingPad";

const mutate = vi.fn();
const reset = vi.fn();
let candidates: string[] | undefined = ["日", "目", "曰"];

// The recognizer is a react-query mutation; expose a fixed candidate list as if a drawing was read.
vi.mock("@/hooks/useHandwriting", () => ({
  useRecognizeHandwriting: () => ({
    data: candidates,
    mutate,
    reset,
    isPending: false,
    isSuccess: candidates !== undefined,
    isError: false,
    error: null,
  }),
}));

/**
 * jsdom implements no PointerEvent, so a fired pointer event would drop the clientX/clientY the pad
 * reads and every captured coordinate would come back NaN. MouseEvent carries them faithfully.
 */
beforeAll(() => {
  if (window.PointerEvent) return;
  class PointerEventShim extends MouseEvent {
    readonly pointerId: number;
    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
      this.pointerId = params.pointerId ?? 0;
    }
  }
  window.PointerEvent = PointerEventShim as unknown as typeof PointerEvent;
});

/** jsdom gives canvases no 2D context and no layout, so stub the bits the pad reads. */
function stubCanvas() {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  vi.spyOn(HTMLCanvasElement.prototype, "getBoundingClientRect").mockReturnValue({
    left: 0,
    top: 0,
    width: 300,
    height: 224,
    right: 300,
    bottom: 224,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  vi.spyOn(HTMLCanvasElement.prototype, "clientWidth", "get").mockReturnValue(300);
}

/** Draw one straight stroke across the pad. */
function drawStroke(canvas: HTMLElement) {
  fireEvent.pointerDown(canvas, {
    pointerId: 1,
    clientX: 10,
    clientY: 10,
  });
  fireEvent.pointerMove(canvas, {
    pointerId: 1,
    clientX: 60,
    clientY: 60,
  });
  fireEvent.pointerUp(canvas, {
    pointerId: 1,
  });
}

describe("HandwritingPad", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    mutate.mockReset();
    reset.mockReset();
    candidates = ["日", "目", "曰"];
    stubCanvas();
  });

  it("renders every recognized candidate as an insertable choice", () => {
    render(<HandwritingPad onPick={vi.fn()} />);
    for (const char of ["日", "目", "曰"]) {
      expect(screen.getByRole("button", {
        name: `Insert ${char}`,
      })).toBeInTheDocument();
    }
  });

  it("hands the chosen character to the caller", () => {
    const onPick = vi.fn();
    render(<HandwritingPad onPick={onPick} />);
    fireEvent.click(screen.getByRole("button", {
      name: "Insert 目",
    }));
    expect(onPick).toHaveBeenCalledWith("目");
  });

  it("clears the pad after a character is chosen, ready for the next one", () => {
    render(<HandwritingPad onPick={vi.fn()} />);
    drawStroke(screen.getByRole("img", {
      name: /Drawing area/,
    }));
    expect(screen.getByRole("button", {
      name: /Undo/,
    })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", {
      name: "Insert 日",
    }));
    expect(reset).toHaveBeenCalled();
    expect(screen.getByRole("button", {
      name: /Undo/,
    })).toBeDisabled();
  });

  it("recognizes once the drawing pauses, not on every stroke", () => {
    vi.useFakeTimers();
    render(<HandwritingPad onPick={vi.fn()} />);
    const canvas = screen.getByRole("img", {
      name: /Drawing area/,
    });

    drawStroke(canvas);
    drawStroke(canvas);
    // Still mid-drawing: the second stroke cancelled the first stroke's pending call.
    expect(mutate).not.toHaveBeenCalled();

    vi.advanceTimersByTime(600);
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(mutate).toHaveBeenCalledWith({
      width: 300,
      height: 224,
      strokes: [
        {
          x: [10, 60],
          y: [10, 60],
        },
        {
          x: [10, 60],
          y: [10, 60],
        },
      ],
    });
  });

  it("does not call the recognizer when nothing has been drawn", () => {
    vi.useFakeTimers();
    render(<HandwritingPad onPick={vi.fn()} />);
    vi.advanceTimersByTime(2000);
    expect(mutate).not.toHaveBeenCalled();
  });

  it("undo removes the last stroke and disables itself once the pad is empty", () => {
    render(<HandwritingPad onPick={vi.fn()} />);
    const canvas = screen.getByRole("img", {
      name: /Drawing area/,
    });
    drawStroke(canvas);

    const undo = screen.getByRole("button", {
      name: /Undo/,
    });
    expect(undo).toBeEnabled();
    fireEvent.click(undo);
    expect(screen.getByRole("button", {
      name: /Undo/,
    })).toBeDisabled();
  });

  it("tells the learner when the recognizer found nothing", () => {
    candidates = [];
    render(<HandwritingPad onPick={vi.fn()} />);
    expect(screen.getByText(/No matches/)).toBeInTheDocument();
  });
});

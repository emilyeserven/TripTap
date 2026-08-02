import { describe, expect, it, vi } from "vitest";

import { appendPoint, drawStrokes, emptyStroke, hasPoints } from "./handwriting";

describe("appendPoint", () => {
  it("always keeps the first point of a stroke", () => {
    expect(appendPoint(emptyStroke(), 5, 7)).toEqual({
      x: [5],
      y: [7],
    });
  });

  it("drops a point that barely moved from the last one", () => {
    const stroke = appendPoint(emptyStroke(), 10, 10);
    // 1px away, under the 2px default threshold.
    expect(appendPoint(stroke, 11, 10)).toBe(stroke);
  });

  it("keeps a point past the distance threshold", () => {
    const stroke = appendPoint(emptyStroke(), 10, 10);
    expect(appendPoint(stroke, 10, 14)).toEqual({
      x: [10, 10],
      y: [10, 14],
    });
  });

  it("measures distance diagonally, not per axis", () => {
    const stroke = appendPoint(emptyStroke(), 0, 0);
    // 1.5px on each axis is ~2.12px of travel, so it survives.
    expect(appendPoint(stroke, 1.5, 1.5).x).toHaveLength(2);
  });

  it("honours a custom threshold", () => {
    const stroke = appendPoint(emptyStroke(), 0, 0);
    expect(appendPoint(stroke, 5, 0, 10)).toBe(stroke);
  });

  it("never mutates the stroke it was given", () => {
    const stroke = appendPoint(emptyStroke(), 0, 0);
    appendPoint(stroke, 50, 50);
    expect(stroke.x).toEqual([0]);
  });
});

describe("hasPoints", () => {
  it("is false for a fresh stroke and true once drawn", () => {
    expect(hasPoints(emptyStroke())).toBe(false);
    expect(hasPoints(appendPoint(emptyStroke(), 1, 1))).toBe(true);
  });
});

describe("drawStrokes", () => {
  it("does nothing without a 2D context (jsdom has none)", () => {
    expect(() => drawStrokes(null, [appendPoint(emptyStroke(), 1, 1)], 100, 100, "#000")).not.toThrow();
  });

  it("clears the canvas and strokes each path", () => {
    const calls: string[] = [];
    const ctx = {
      clearRect: () => calls.push("clearRect"),
      beginPath: () => calls.push("beginPath"),
      moveTo: () => calls.push("moveTo"),
      lineTo: () => calls.push("lineTo"),
      stroke: () => calls.push("stroke"),
    } as unknown as CanvasRenderingContext2D;

    drawStrokes(ctx, [
      {
        x: [0, 5, 10],
        y: [0, 5, 10],
      },
      {
        x: [20],
        y: [20],
      },
    ], 100, 100, "#000");

    expect(calls[0]).toBe("clearRect");
    expect(calls.filter(c => c === "beginPath")).toHaveLength(2);
    expect(calls.filter(c => c === "stroke")).toHaveLength(2);
    // Two segments for the first stroke, plus the single-point stroke's visible dot.
    expect(calls.filter(c => c === "lineTo")).toHaveLength(3);
  });

  it("skips strokes that hold no points", () => {
    const ctx = {
      clearRect: vi.fn(),
      beginPath: () => {
        throw new Error("should not start a path for an empty stroke");
      },
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    expect(() => drawStrokes(ctx, [emptyStroke()], 100, 100, "#000")).not.toThrow();
  });
});

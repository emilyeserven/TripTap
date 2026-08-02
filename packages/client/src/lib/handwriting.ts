/**
 * Pure stroke helpers for the dictionary lookup's draw pad. The canvas maths lives here rather than in
 * the component so it can be unit-tested without a DOM, matching how `cropImage.ts` keeps the capture
 * feature's canvas work out of `CropDialog`.
 */

import type { HandwritingStroke } from "@sentence-bank/types";

/** Below this many CSS pixels from the previous kept point, a sample adds nothing but payload. */
const DEFAULT_MIN_DISTANCE = 2;

/** An empty stroke, ready to accumulate points. */
export function emptyStroke(): HandwritingStroke {
  return {
    x: [],
    y: [],
  };
}

/**
 * Append a point to a stroke unless it's within `minDistance` of the last one. Pointer events fire far
 * faster than a hand moves, so a slow, deliberate drag would otherwise pile up hundreds of
 * near-identical samples — enough to trip the route's per-stroke point cap on a single stroke.
 * Returns a new stroke; the input is left untouched.
 */
export function appendPoint(
  stroke: HandwritingStroke,
  x: number,
  y: number,
  minDistance = DEFAULT_MIN_DISTANCE,
): HandwritingStroke {
  const last = stroke.x.length - 1;
  if (last >= 0) {
    const dx = x - stroke.x[last];
    const dy = y - stroke.y[last];
    if (Math.hypot(dx, dy) < minDistance) return stroke;
  }
  return {
    x: [...stroke.x, x],
    y: [...stroke.y, y],
  };
}

/** Whether a stroke holds enough points to draw — a single tap is a dot, not a stroke. */
export function hasPoints(stroke: HandwritingStroke): boolean {
  return stroke.x.length > 0;
}

/**
 * Redraw every stroke onto a 2D context, clearing first. Used after an undo, where the cheapest
 * correct thing is to repaint from the retained strokes rather than track what to erase. `color` is
 * resolved by the caller from the theme, so ink stays legible in both light and dark mode.
 *
 * `ctx` is nullable because jsdom has no 2D context: the pad must survive rendering in tests.
 */
export function drawStrokes(
  ctx: CanvasRenderingContext2D | null,
  strokes: HandwritingStroke[],
  width: number,
  height: number,
  color: string,
): void {
  if (!ctx) return;

  ctx.clearRect(0, 0, width, height);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = 4;
  ctx.strokeStyle = color;

  for (const stroke of strokes) {
    if (!hasPoints(stroke)) continue;
    ctx.beginPath();
    ctx.moveTo(stroke.x[0], stroke.y[0]);
    for (let i = 1; i < stroke.x.length; i += 1) {
      ctx.lineTo(stroke.x[i], stroke.y[i]);
    }
    // A single-point stroke has no segment to stroke, so nudge it into a visible dot.
    if (stroke.x.length === 1) ctx.lineTo(stroke.x[0] + 0.1, stroke.y[0] + 0.1);
    ctx.stroke();
  }
}

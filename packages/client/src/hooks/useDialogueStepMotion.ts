import { useLayoutEffect, useRef } from "react";

/** How long a step takes. Long enough to read as movement, short enough not to gate the next step. */
const DURATION_MS = 260;
/** How far a newly arrived line travels as it fades in, in px. */
const TRAVEL_PX = 16;
const EASING = "cubic-bezier(0.2, 0.8, 0.2, 1)";

/** Bubbles the hook can find and move. Set by `DialogueLineBubble`, valued with the line's id. */
const LINE_SELECTOR = "[data-dialogue-line]";

function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

/**
 * Animates a stepped dialogue window: the bubbles drift up as the learner advances and down as they
 * go back, so a step reads as movement through the conversation rather than a swap.
 *
 * The motion is measured rather than declared, because a CSS enter animation is the wrong tool here.
 * A line that is already on screen only *moves* between steps — it must keep its DOM node and glide
 * from where it was. Re-mounting it to replay an enter animation restarts it from `opacity: 0`, so
 * the sentence the learner is reading blinks out and back on every step; that blink, truncated at
 * random by the next click, is what intermittent flashing looks like. So: measure each bubble, and
 * on the next step animate the ones that moved from their old position to their new one.
 *
 * Returns the ref to hang on the bubbles' scroll container.
 */
export function useDialogueStepMotion(
  step: number,
  direction: "back" | "forward",
): React.RefObject<HTMLDivElement | null> {
  const listRef = useRef<HTMLDivElement | null>(null);
  /** Where each line sat when it was last laid out, by line id. */
  const offsets = useRef(new Map<string, number>());
  const lastStep = useRef(-1);

  // Layout effect, not a plain effect: the animations have to be attached before the browser paints,
  // or the bubble shows up at its resting place for a frame and only then jumps back to animate.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (list === null) return;

    const nodes = [...list.querySelectorAll<HTMLElement>(LINE_SELECTOR)];
    const previous = offsets.current;
    const next = new Map<string, number>();
    // `offsetTop` comes from layout, so it ignores whatever transform an in-flight glide is applying:
    // a fast double-step measures where a bubble *belongs* rather than where it currently sits, and
    // the second step can't compound the first one's offset.
    for (const node of nodes) next.set(node.dataset.dialogueLine ?? "", node.offsetTop);
    offsets.current = next;

    // Re-renders that aren't steps (revealing a hidden line, toggling translations) must not animate,
    // or the learner's own click would shove the transcript around.
    const stepped = lastStep.current !== step;
    lastStep.current = step;
    if (!stepped || prefersReducedMotion()) return;

    for (const node of nodes) {
      if (typeof node.animate !== "function") return;
      // Whatever is still running belongs to the previous step; let this one own the bubble outright.
      for (const running of node.getAnimations()) running.cancel();

      const id = node.dataset.dialogueLine ?? "";
      const to = next.get(id) ?? 0;
      const from = previous.get(id);
      const timing = {
        duration: DURATION_MS,
        easing: EASING,
        // Backwards fill so the opening frame is the animation's, even if it starts a tick late.
        fill: "backwards" as const,
      };

      if (from === undefined) {
        // A line the learner hasn't seen yet: fade it in, entering from the direction of travel.
        const enter = direction === "forward" ? TRAVEL_PX : -TRAVEL_PX;
        node.animate([
          {
            opacity: "0",
            transform: `translateY(${enter}px)`,
          },
          {
            // Its resting opacity, not 1 — a line arriving into the faded prior slot stays faded.
            opacity: getComputedStyle(node).opacity,
            transform: "none",
          },
        ], timing);
        continue;
      }

      if (Math.round(from) !== Math.round(to)) {
        // Already on screen, only moved. Transform alone: it keeps its node and its opacity, so it
        // glides instead of blinking, and the dimming is left to a CSS transition.
        node.animate([
          {
            transform: `translateY(${from - to}px)`,
          },
          {
            transform: "none",
          },
        ], timing);
      }
    }
  });

  return listRef;
}

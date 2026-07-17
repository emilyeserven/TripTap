import { Mark, mergeAttributes } from "@tiptap/core";

/**
 * Tailwind classes for the two correction marks, shared with any read-only rendering.
 * `correct` = green affirmation (kept in the result); `incorrect` = red strikethrough (dropped).
 */
const MARK_CORRECT_CLASS = `
  rounded-sm bg-emerald-500/15 text-emerald-700
  dark:text-emerald-400
`;
const MARK_INCORRECT_CLASS = "rounded-sm text-destructive line-through decoration-destructive/60";

/** A span the learner affirmed as correct — tinted green, kept in the derived correction. */
export const CorrectMark = Mark.create({
  name: "correct",
  // Mutually exclusive with `incorrect`: applying one clears the other on the span.
  excludes: "incorrect",
  parseHTML() {
    return [{
      tag: "span[data-correct]",
    }];
  },
  renderHTML({
    HTMLAttributes,
  }) {
    return ["span", mergeAttributes(HTMLAttributes, {
      "data-correct": "",
      "class": MARK_CORRECT_CLASS,
    }), 0];
  },
});

/** A span the learner marked wrong — struck through and removed from the derived correction. */
export const IncorrectMark = Mark.create({
  name: "incorrect",
  excludes: "correct",
  parseHTML() {
    return [{
      tag: "span[data-incorrect]",
    }];
  },
  renderHTML({
    HTMLAttributes,
  }) {
    return ["span", mergeAttributes(HTMLAttributes, {
      "data-incorrect": "",
      "class": MARK_INCORRECT_CLASS,
    }), 0];
  },
});

import type { Mark, MarkType, Node as PMNode } from "@tiptap/pm/model";
import type { Command, Transaction } from "@tiptap/pm/state";

import { Extension } from "@tiptap/core";
import { keymap } from "@tiptap/pm/keymap";
import { Plugin, TextSelection } from "@tiptap/pm/state";
import { Mapping } from "@tiptap/pm/transform";

/** Meta flag marking our own transactions so `appendTransaction` doesn't re-process them. */
const META = "trackChanges";

type MarkKind = "correct" | "incorrect" | "original";

/** Classify a character by the marks on its text node: an affirmed insertion, a struck original, or plain. */
function classifyMarks(marks: readonly Mark[], correct: MarkType, incorrect: MarkType): MarkKind {
  if (correct.isInSet(marks)) return "correct";
  if (incorrect.isInSet(marks)) return "incorrect";
  return "original";
}

/**
 * Apply a "deletion" across `[from, to)` in track-changes style: struck-out originals get the `incorrect`
 * mark (kept, but dropped from the result), `correct` insertions are truly removed, and already-`incorrect`
 * spans are left as-is. Mutates `tr`. Marks are added first (positions stable), then correct runs are
 * deleted right-to-left so earlier positions stay valid.
 */
function strikeOrDeleteRange(
  tr: Transaction,
  doc: PMNode,
  from: number,
  to: number,
  correct: MarkType,
  incorrect: MarkType,
): void {
  const segments: { from: number;
    to: number;
    kind: MarkKind; }[] = [];
  doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isText) return;
    const a = Math.max(from, pos);
    const b = Math.min(to, pos + node.nodeSize);
    if (a >= b) return;
    segments.push({
      from: a,
      to: b,
      kind: classifyMarks(node.marks, correct, incorrect),
    });
  });
  for (const s of segments) {
    if (s.kind === "original") tr.addMark(s.from, s.to, incorrect.create());
  }
  for (let i = segments.length - 1; i >= 0; i--) {
    const s = segments[i];
    if (s.kind === "correct") tr.delete(s.from, s.to);
  }
}

/** Build a Backspace (`dir = -1`) or Delete (`dir = 1`) command that edits in track-changes style. */
export function makeDeleteCommand(dir: -1 | 1): Command {
  return (state, dispatch) => {
    const correct = state.schema.marks.correct;
    const incorrect = state.schema.marks.incorrect;
    if (!correct || !incorrect) return false;
    const {
      selection, doc,
    } = state;

    // Range deletion: strike originals / remove insertions across the whole selection.
    if (!selection.empty) {
      const {
        from, to,
      } = selection;
      const tr = state.tr;
      strikeOrDeleteRange(tr, doc, from, to, correct, incorrect);
      tr.setSelection(TextSelection.create(tr.doc, tr.mapping.map(from)));
      if (dispatch) dispatch(tr.scrollIntoView());
      return true;
    }

    const pos = selection.from;
    const $pos = doc.resolve(pos);
    const node = dir < 0 ? $pos.nodeBefore : $pos.nodeAfter;
    if (!node || !node.isText) return false; // at a block boundary — let the default handler join.

    const charFrom = dir < 0 ? pos - 1 : pos;
    const charTo = dir < 0 ? pos : pos + 1;
    const kind = classifyMarks(node.marks, correct, incorrect);
    const tr = state.tr;
    if (kind === "correct") {
      tr.delete(charFrom, charTo); // remove your own insertion
    }
    else if (kind === "incorrect") {
      tr.setSelection(TextSelection.create(doc, dir < 0 ? charFrom : charTo)); // already struck — skip past
    }
    else {
      tr.addMark(charFrom, charTo, incorrect.create()); // strike an original char
      tr.setSelection(TextSelection.create(tr.doc, dir < 0 ? charFrom : charTo));
    }
    if (dispatch) dispatch(tr.scrollIntoView());
    return true;
  };
}

/**
 * A TipTap extension that turns the editor into a lightweight track-changes surface: deletions strike the
 * original text (`incorrect`) instead of removing it, and any inserted text (typing, IME, paste) is marked
 * `correct`. The corrected sentence is derived elsewhere (drop `incorrect`, keep the rest).
 */
export const TrackChanges = Extension.create({
  name: "trackChanges",
  // Run ahead of StarterKit so our Backspace/Delete handlers win.
  priority: 1000,

  addProseMirrorPlugins() {
    const backspace = makeDeleteCommand(-1);
    const del = makeDeleteCommand(1);

    return [
      keymap({
        Backspace: backspace,
        Delete: del,
      }),
      new Plugin({
        props: {
          // Selection-replace typing: strike/remove the selection, then insert the text as `correct`.
          handleTextInput(view, from, to, text) {
            if (from === to) return false; // collapsed insert — handled by appendTransaction below.
            const {
              state,
            } = view;
            const correct = state.schema.marks.correct;
            const incorrect = state.schema.marks.incorrect;
            if (!correct || !incorrect) return false;
            const tr = state.tr;
            strikeOrDeleteRange(tr, state.doc, from, to, correct, incorrect);
            const at = tr.mapping.map(to);
            tr.insertText(text, at);
            tr.addMark(at, at + text.length, correct.create());
            tr.removeMark(at, at + text.length, incorrect);
            tr.setSelection(TextSelection.create(tr.doc, at + text.length));
            tr.setMeta(META, true);
            view.dispatch(tr.scrollIntoView());
            return true;
          },
        },

        // Tag any freshly inserted text `correct` (covers collapsed typing, IME, and paste).
        appendTransaction(transactions, _oldState, newState) {
          const correct = newState.schema.marks.correct;
          const incorrect = newState.schema.marks.incorrect;
          if (!correct || !incorrect) return null;

          const ranges: [number, number][] = [];
          for (const tr of transactions) {
            if (!tr.docChanged || tr.getMeta(META)) continue;
            tr.mapping.maps.forEach((stepMap, i) => {
              stepMap.forEach((_oldStart, _oldEnd, newStart, newEnd) => {
                if (newEnd <= newStart) return; // pure deletion — nothing inserted
                const rest = new Mapping(tr.mapping.maps.slice(i + 1));
                ranges.push([rest.map(newStart, -1), rest.map(newEnd, 1)]);
              });
            });
          }
          if (ranges.length === 0) return null;

          const tr = newState.tr;
          let changed = false;
          for (const [from, to] of ranges) {
            if (to <= from) continue;
            tr.removeMark(from, to, incorrect);
            tr.addMark(from, to, correct.create());
            changed = true;
          }
          if (!changed) return null;
          tr.setMeta(META, true);
          tr.setMeta("addToHistory", false);
          return tr;
        },
      }),
    ];
  },
});

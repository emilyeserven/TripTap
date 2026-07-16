import type { Node as PMNode, Schema } from "@tiptap/pm/model";
import type { Command, EditorState as PMState } from "@tiptap/pm/state";

import { getSchema } from "@tiptap/core";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";

import { deriveCorrection } from "@/lib/deriveCorrection";
import { CorrectMark, IncorrectMark } from "@/lib/tiptap/correctionMarks";
import { makeDeleteCommand, TrackChanges } from "@/lib/tiptap/trackChanges";

const schema: Schema = getSchema([StarterKit, CorrectMark, IncorrectMark, TrackChanges]);

/** A text node with the named marks (e.g. "correct", "incorrect") applied. */
function t(value: string, ...markNames: string[]): PMNode {
  return schema.text(value, markNames.map(n => schema.marks[n].create()));
}

/** A single-paragraph doc from the given inline text nodes. */
function docOf(...texts: PMNode[]): PMNode {
  return schema.node("doc", null, [schema.node("paragraph", null, texts)]);
}

/** Apply a command to a fresh state and return the resulting state (running plugin appendTransactions). */
function run(doc: PMNode, selFrom: number, selTo: number, cmd: Command): PMState {
  const state = EditorState.create({
    schema,
    doc,
    selection: TextSelection.create(doc, selFrom, selTo),
  });
  let next = state;
  cmd(state, (tr) => {
    next = state.apply(tr);
  });
  return next;
}

const backspace = makeDeleteCommand(-1);
const del = makeDeleteCommand(1);
const correctionOf = (state: PMState) => deriveCorrection(state.doc.toJSON()).correction;

describe("trackChanges delete commands", () => {
  it("backspace over an original char strikes it (kept in the doc, dropped from the result)", () => {
    const doc = docOf(t("cat"));
    const end = doc.content.size - 1; // caret after the final char
    const next = run(doc, end, end, backspace);
    expect(next.doc.textContent).toBe("cat"); // still visible in the editor
    expect(correctionOf(next)).toBe("ca"); // but struck out of the correction
  });

  it("backspace over your own inserted (correct) char truly removes it", () => {
    const doc = docOf(t("ca"), t("t", "correct"));
    const end = doc.content.size - 1;
    const next = run(doc, end, end, backspace);
    expect(next.doc.textContent).toBe("ca");
    expect(correctionOf(next)).toBe("ca");
  });

  it("backspace over an already-struck (incorrect) char leaves the doc unchanged", () => {
    const doc = docOf(t("ca"), t("t", "incorrect"));
    const end = doc.content.size - 1;
    const next = run(doc, end, end, backspace);
    expect(next.doc.textContent).toBe("cat"); // nothing removed
    expect(next.doc.eq(doc)).toBe(true); // only the selection moved
    expect(correctionOf(next)).toBe("ca");
  });

  it("forward delete strikes the next original char", () => {
    const doc = docOf(t("cat"));
    const start = 1; // caret before the first char
    const next = run(doc, start, start, del);
    expect(next.doc.textContent).toBe("cat");
    expect(correctionOf(next)).toBe("at");
  });

  it("range delete strikes originals and removes inserted (correct) spans", () => {
    const doc = docOf(t("a"), t("b", "correct"), t("c"));
    const next = run(doc, 1, doc.content.size - 1, backspace);
    expect(next.doc.textContent).toBe("ac"); // 'b' removed; 'a' and 'c' struck but present
    expect(correctionOf(next)).toBe(""); // both originals dropped
  });
});

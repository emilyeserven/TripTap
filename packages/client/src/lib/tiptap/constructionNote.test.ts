import type { ConstructionSlot } from "@sentence-bank/types";

import { getSchema } from "@tiptap/core";
import { EditorState, TextSelection } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";

import { BlockChip, docToNote, noteToDoc, slashRange } from "./constructionNote";

const slots: ConstructionSlot[] = [
  {
    id: "s1",
    alternatives: [
      {
        id: "a1",
        label: "Adj",
        forms: ["Short"],
      },
      {
        id: "a2",
        label: "Verb",
        forms: ["Short"],
      },
    ],
  },
  {
    id: "s2",
    alternatives: [
      {
        id: "a3",
        label: "Noun",
        forms: [],
      },
    ],
  },
];

describe("noteToDoc", () => {
  it("wraps plain text in one paragraph", () => {
    expect(noteToDoc("just text", slots)).toEqual({
      type: "doc",
      content: [{
        type: "paragraph",
        content: [{
          type: "text",
          text: "just text",
        }],
      }],
    });
  });

  it("turns matching tokens into chips", () => {
    expect(noteToDoc("A [Noun] here", slots).content?.[0]?.content).toEqual([
      {
        type: "text",
        text: "A ",
      },
      {
        type: "blockChip",
        attrs: {
          label: "Noun",
        },
      },
      {
        type: "text",
        text: " here",
      },
    ]);
  });

  it("matches the joined-labels token", () => {
    expect(noteToDoc("[Adj/Verb]", slots).content?.[0]?.content).toEqual([
      {
        type: "blockChip",
        attrs: {
          label: "Adj/Verb",
        },
      },
    ]);
  });

  it("keeps unmatched tokens as text with brackets", () => {
    expect(noteToDoc("see [Whatever]", slots).content?.[0]?.content).toEqual([
      {
        type: "text",
        text: "see [Whatever]",
      },
    ]);
  });

  it("splits lines into paragraphs, keeping empty ones", () => {
    const doc = noteToDoc("a\n\nb", slots);
    expect(doc.content).toHaveLength(3);
    expect(doc.content?.[1]).toEqual({
      type: "paragraph",
    });
  });

  it("maps null and empty to a single empty paragraph", () => {
    for (const note of [null, ""]) {
      expect(noteToDoc(note, slots)).toEqual({
        type: "doc",
        content: [{
          type: "paragraph",
        }],
      });
    }
  });
});

describe("docToNote", () => {
  it("serializes chips back to bracket tokens", () => {
    expect(docToNote(noteToDoc("A [Noun] here", slots))).toBe("A [Noun] here");
  });

  it("turns hardBreak into a newline", () => {
    expect(docToNote({
      type: "doc",
      content: [{
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "a",
          },
          {
            type: "hardBreak",
          },
          {
            type: "text",
            text: "b",
          },
        ],
      }],
    })).toBe("a\nb");
  });

  it("returns null for an empty doc", () => {
    expect(docToNote({
      type: "doc",
      content: [{
        type: "paragraph",
      }],
    })).toBeNull();
  });

  it("round-trips every note shape", () => {
    const notes = [
      "plain",
      "A [Noun] who is [Adj/Verb]",
      "[unknown] stays bracketed",
      "multi\nline\n\nnote",
      "brackets [in] the middle of [Noun] text",
      "\ntrailing and leading\n",
    ];
    for (const note of notes) {
      expect(docToNote(noteToDoc(note, slots))).toBe(note.trim() ? note : null);
    }
  });
});

describe("slashRange", () => {
  const schema = getSchema([StarterKit, BlockChip]);

  /** Build an EditorState from a note string with the cursor at the end of the first paragraph. */
  function stateFor(note: string, cursorOffsetFromEnd = 0) {
    const doc = schema.nodeFromJSON(noteToDoc(note, slots));
    const end = doc.firstChild ? 1 + doc.firstChild.content.size : 1;
    const state = EditorState.create({
      schema,
      doc,
    });
    return state.apply(
      state.tr.setSelection(TextSelection.create(doc, end - cursorOffsetFromEnd)),
    );
  }

  it("detects a slash at the start of a block", () => {
    expect(slashRange(stateFor("/no"))).toEqual({
      from: 1,
      to: 4,
      query: "no",
    });
  });

  it("detects a slash after whitespace", () => {
    expect(slashRange(stateFor("see /Ad"))).toEqual({
      from: 5,
      to: 8,
      query: "Ad",
    });
  });

  it("ignores a slash mid-word", () => {
    expect(slashRange(stateFor("and/or"))).toBeNull();
  });

  it("ignores a slash once whitespace follows", () => {
    expect(slashRange(stateFor("/no more"))).toBeNull();
  });

  it("ignores a slash when the cursor moved away", () => {
    expect(slashRange(stateFor("/no", 2))).toEqual({
      from: 1,
      to: 2,
      query: "",
    });
    expect(slashRange(stateFor("x /no", 4))).toBeNull();
  });

  it("treats a chip before the slash as a boundary", () => {
    // "[Noun] /q" — the chip serializes as the atom sentinel, then space, then /q.
    expect(slashRange(stateFor("[Noun] /q"))).toEqual({
      from: 3,
      to: 5,
      query: "q",
    });
  });
});

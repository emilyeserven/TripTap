// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  annotateSentence,
  explanationBlocks,
  explainSentence,
  parseExplanationLines,
  parseExplanationRefs,
} from "./explanationRefs";

const SENTENCE = "昨日は友達と映画を見ました。";

/** Annotating must never lose or reorder characters — asserted alongside every annotate case. */
function expectLossless(target: string, segments: { text: string }[]) {
  expect(segments.map(s => s.text).join("")).toBe(target);
}

describe("parseExplanationRefs", () => {
  it("resolves a phrase that appears in the sentence", () => {
    expect(parseExplanationRefs("見ました: past tense", SENTENCE)).toEqual([
      {
        snippet: "見ました",
        body: "past tense",
        line: 0,
      },
    ]);
  });

  it("leaves prose alone when the phrase is not in the sentence", () => {
    expect(parseExplanationRefs("Note: remember this", SENTENCE)).toEqual([]);
  });

  it("accepts a full-width colon", () => {
    expect(parseExplanationRefs("は：topic marker", SENTENCE)[0]?.snippet).toBe("は");
  });

  it.each([
    ["- ", "- 映画: the film"],
    ["* ", "* 映画: the film"],
    ["+ ", "+ 映画: the film"],
    ["1. ", "1. 映画: the film"],
    ["1) ", "1) 映画: the film"],
    // Bullet/dash glyphs, with or without a following space, resolve the same as a bare phrase.
    ["・", "・映画: the film"],
    ["・ ", "・ 映画: the film"],
    ["• ", "• 映画: the film"],
    ["– ", "– 映画: the film"],
    ["·", "·映画: the film"],
  ])("strips a leading %s list marker", (_marker, line) => {
    expect(parseExplanationRefs(line, SENTENCE)[0]?.snippet).toBe("映画");
  });

  it.each([
    ["**友達**: friend"],
    ["`友達`: friend"],
    ["\"友達\": friend"],
    ["「友達」: friend"],
    ["『友達』: friend"],
  ])("unwraps decoration around the phrase in %s", (line) => {
    expect(parseExplanationRefs(line, SENTENCE)[0]?.snippet).toBe("友達");
  });

  it("picks the colon that makes the phrase resolve, so a note may contain colons", () => {
    const [ref] = parseExplanationRefs("映画: means \"film\": not \"movie theatre\"", SENTENCE);
    expect(ref.snippet).toBe("映画");
    expect(ref.body).toBe("means \"film\": not \"movie theatre\"");
  });

  it("resolves a phrase that itself contains a colon", () => {
    const [ref] = parseExplanationRefs("a:b: the tricky one", "x a:b y");
    expect(ref.snippet).toBe("a:b");
    expect(ref.body).toBe("the tricky one");
  });

  it("ignores a line with an empty note", () => {
    expect(parseExplanationRefs("映画:", SENTENCE)).toEqual([]);
  });

  it("ignores a line with an empty phrase", () => {
    expect(parseExplanationRefs(": orphaned note", SENTENCE)).toEqual([]);
  });

  it("keeps both lines when two refer to the same phrase (notes shown together)", () => {
    const refs = parseExplanationRefs("映画: first\n映画: second", SENTENCE);
    expect(refs).toHaveLength(2);
    expect(refs.map(r => r.body)).toEqual(["first", "second"]);
  });

  it.each([null, undefined, "", "   "])("returns nothing for %p", (explanation) => {
    expect(parseExplanationRefs(explanation, SENTENCE)).toEqual([]);
  });

  it("returns nothing when there is no target sentence", () => {
    expect(parseExplanationRefs("映画: the film", "")).toEqual([]);
  });
});

describe("parseExplanationLines", () => {
  it("reports a phrase that is not in the sentence as an unmatched candidate", () => {
    const [line] = parseExplanationLines("見ますた: typo'd phrase", SENTENCE);
    expect(line.candidate).toBe("見ますた");
    expect(line.matched).toBe(false);
  });

  it("reports a line with no colon as plain prose", () => {
    const [line] = parseExplanationLines("just a comment", SENTENCE);
    expect(line.candidate).toBeNull();
    expect(line.matched).toBe(false);
  });
});

describe("annotateSentence", () => {
  it("splits the sentence around a single reference", () => {
    const refs = parseExplanationRefs("友達: friend", SENTENCE);
    const segments = annotateSentence(SENTENCE, refs);
    expectLossless(SENTENCE, segments);
    expect(segments.filter(s => s.refs.length > 0)).toHaveLength(1);
    expect(segments.find(s => s.refs.length > 0)?.text).toBe("友達");
  });

  it("carries every note for a phrase on its span", () => {
    const refs = parseExplanationRefs("映画: the film\n映画: also 'movie'", SENTENCE);
    const segments = annotateSentence(SENTENCE, refs);
    expectLossless(SENTENCE, segments);
    const annotated = segments.find(s => s.text === "映画");
    expect(annotated?.refs.map(r => r.body)).toEqual(["the film", "also 'movie'"]);
  });

  it("annotates every occurrence of a phrase, not just the first", () => {
    const target = "はははは";
    const segments = annotateSentence(target, parseExplanationRefs("は: topic", target));
    expectLossless(target, segments);
    expect(segments.filter(s => s.refs.length > 0)).toHaveLength(4);
  });

  it("emits no empty segment when a reference starts or ends the sentence", () => {
    const target = "映画を見た";
    const segments = annotateSentence(
      target,
      parseExplanationRefs("映画: film\n見た: saw", target),
    );
    expectLossless(target, segments);
    expect(segments.every(s => s.text.length > 0)).toBe(true);
  });

  it("gives an overlapping span to the longer phrase but keeps the shorter one elsewhere", () => {
    const target = "食べている。食べた。";
    const segments = annotateSentence(
      target,
      parseExplanationRefs("食べ: stem\n食べている: progressive", target),
    );
    expectLossless(target, segments);
    const annotated = segments.filter(s => s.refs.length > 0);
    expect(annotated.map(s => s.text)).toEqual(["食べている", "食べ"]);
  });

  it("lets the longer phrase win when one is nested in the other", () => {
    const target = "食べて";
    const segments = annotateSentence(
      target,
      parseExplanationRefs("食べ: stem\n食べて: te-form", target),
    );
    expectLossless(target, segments);
    expect(segments.filter(s => s.refs.length > 0).map(s => s.text)).toEqual(["食べて"]);
  });

  it("treats regex metacharacters in a phrase literally", () => {
    const target = "cost a.b*c( today";
    const segments = annotateSentence(target, parseExplanationRefs("a.b*c(: literal", target));
    expectLossless(target, segments);
    expect(segments.find(s => s.refs.length > 0)?.text).toBe("a.b*c(");
  });

  it("skips an empty phrase instead of looping forever", () => {
    const segments = annotateSentence(SENTENCE, [
      {
        snippet: "",
        body: "nothing",
        line: 0,
      },
    ]);
    expect(segments).toEqual([
      {
        text: SENTENCE,
        refs: [],
      },
    ]);
  });

  it("ignores a phrase longer than the sentence", () => {
    const segments = annotateSentence("短い", [
      {
        snippet: "とても長いフレーズ",
        body: "x",
        line: 0,
      },
    ]);
    expect(segments.filter(s => s.refs.length > 0)).toHaveLength(0);
  });

  it("returns one plain segment when there are no references", () => {
    expect(annotateSentence(SENTENCE, [])).toEqual([
      {
        text: SENTENCE,
        refs: [],
      },
    ]);
  });

  it("returns nothing for an empty sentence", () => {
    expect(annotateSentence("", [])).toEqual([]);
  });
});

describe("explanationBlocks", () => {
  it("keeps references and prose in the order they were written", () => {
    const blocks = explanationBlocks("Overall good.\n映画: the film\nWatch the tense.", SENTENCE);
    expect(blocks.map(b => b.kind)).toEqual(["prose", "ref", "prose"]);
  });

  it("coalesces consecutive prose lines into one Markdown block", () => {
    const blocks = explanationBlocks("- one\n- two", SENTENCE);
    expect(blocks).toEqual([
      {
        kind: "prose",
        text: "- one\n- two",
      },
    ]);
  });

  it("keeps two reference lines as separate blocks so they cannot collapse together", () => {
    const blocks = explanationBlocks("映画: the film\n友達: friend", SENTENCE);
    expect(blocks.map(b => b.kind)).toEqual(["ref", "ref"]);
  });
});

describe("explainSentence", () => {
  it("reports whether anything resolved", () => {
    expect(explainSentence(SENTENCE, "映画: the film").hasRefs).toBe(true);
    expect(explainSentence(SENTENCE, "Note: nothing here").hasRefs).toBe(false);
  });
});

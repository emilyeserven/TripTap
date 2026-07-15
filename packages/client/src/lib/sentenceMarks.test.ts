import { describe, expect, it } from "vitest";

import { addMark, buildCorrection, markRuns, removeMark } from "./sentenceMarks";

describe("markRuns", () => {
  it("splits text into unmarked + marked runs", () => {
    expect(markRuns("cat", [{
      start: 1,
      end: 2,
      correct: false,
    }])).toEqual([
      {
        start: 0,
        end: 1,
        correct: null,
      },
      {
        start: 1,
        end: 2,
        correct: false,
      },
      {
        start: 2,
        end: 3,
        correct: null,
      },
    ]);
  });

  it("returns a single unmarked run when there are no marks", () => {
    expect(markRuns("cat", [])).toEqual([{
      start: 0,
      end: 3,
      correct: null,
    }]);
  });
});

describe("addMark / removeMark", () => {
  it("drops overlapping marks so the newest wins, keeping them start-sorted", () => {
    const marks = [{
      start: 0,
      end: 2,
      correct: true,
    }];
    const next = {
      start: 1,
      end: 3,
      correct: false,
    };
    expect(addMark(marks, next)).toEqual([{
      start: 1,
      end: 3,
      correct: false,
    }]);
  });

  it("keeps non-overlapping marks", () => {
    const marks = [{
      start: 0,
      end: 1,
      correct: true,
    }];
    expect(addMark(marks, {
      start: 2,
      end: 3,
      correct: false,
    })).toEqual([
      {
        start: 0,
        end: 1,
        correct: true,
      },
      {
        start: 2,
        end: 3,
        correct: false,
      },
    ]);
  });

  it("removes a mark by its start offset", () => {
    const marks = [
      {
        start: 0,
        end: 1,
        correct: true,
      },
      {
        start: 2,
        end: 3,
        correct: false,
      },
    ];
    expect(removeMark(marks, 2)).toEqual([{
      start: 0,
      end: 1,
      correct: true,
    }]);
  });
});

describe("buildCorrection", () => {
  it("keeps the original when nothing is edited", () => {
    expect(buildCorrection("cat", [], [])).toBe("cat");
  });

  it("drops incorrect spans and splices insertions at their offset", () => {
    // 'a' is wrong; insert 'o' where it was → "cot".
    expect(buildCorrection(
      "cat",
      [{
        start: 1,
        end: 2,
        correct: false,
      }],
      [{
        at: 1,
        text: "o",
      }],
    )).toBe("cot");
  });

  it("keeps correct-marked spans", () => {
    expect(buildCorrection("cat", [{
      start: 0,
      end: 3,
      correct: true,
    }], [])).toBe("cat");
  });

  it("appends a trailing insertion", () => {
    expect(buildCorrection("cat", [], [{
      at: 3,
      text: "s",
    }])).toBe("cats");
  });
});

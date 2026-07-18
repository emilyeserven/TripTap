import type { AnswerSheet, AnswerSheetEntry, QuestionSheet } from "@sentence-bank/types";

import { describe, expect, it } from "vitest";

import {
  answerSheetMeetsDueDate,
  dueDateMet,
  isAnswerSheetComplete,
  matchesLearningArea,
  hasCorrectionDetail,
  isEntryAnswered,
  isEntryTouched,
  matchesResource,
  resourceFilterOptions,
} from "./answer-sheets";

function entry(slotId: string, value: string): AnswerSheetEntry {
  return {
    slotId,
    value,
    correct: null,
    correction: null,
    reasoning: null,
    intendedMeaning: null,
    actualMeaning: null,
    marks: null,
  };
}

/** A two-question list sheet, created 2026-07-01, due 2026-07-31. */
function listSheet(overrides: Partial<QuestionSheet> = {}): QuestionSheet {
  return {
    id: "qs1",
    title: "Genki L3",
    notes: null,
    page: null,
    bookmarkId: null,
    bookmarkTitle: null,
    bookmarkUrl: null,
    dueDate: "2026-07-31T00:00:00.000Z",
    learningAreas: [],
    grammarTerms: [],
    layout: "list",
    questions: [
      {
        id: "q1",
        prompt: "One",
      },
      {
        id: "q2",
        prompt: "Two",
      },
    ],
    grid: null,
    createdAt: "2026-07-01T14:30:00.000Z",
    updatedAt: "2026-07-01T14:30:00.000Z",
    ...overrides,
  };
}

function answer(overrides: Partial<AnswerSheet> = {}): AnswerSheet {
  return {
    id: "as1",
    questionSheetId: "qs1",
    title: "Attempt",
    date: "2026-07-15T00:00:00.000Z",
    entries: [entry("q1", "答え1"), entry("q2", "答え2")],
    createdAt: "2026-07-15T00:00:00.000Z",
    updatedAt: "2026-07-15T00:00:00.000Z",
    ...overrides,
  };
}

describe("isAnswerSheetComplete", () => {
  it("is true when every slot has a non-empty answer", () => {
    expect(isAnswerSheetComplete(listSheet(), answer())).toBe(true);
  });

  it("is false when a slot is missing", () => {
    expect(isAnswerSheetComplete(listSheet(), answer({
      entries: [entry("q1", "答え1")],
    }))).toBe(false);
  });

  it("is false when a slot value is blank/whitespace", () => {
    expect(isAnswerSheetComplete(listSheet(), answer({
      entries: [entry("q1", "答え1"), entry("q2", "   ")],
    }))).toBe(false);
  });

  it("is false for a sheet with no slots", () => {
    expect(isAnswerSheetComplete(listSheet({
      questions: [],
    }), answer({
      entries: [],
    }))).toBe(false);
  });
});

describe("answerSheetMeetsDueDate", () => {
  it("is met when complete and dated within the window", () => {
    expect(answerSheetMeetsDueDate(listSheet(), answer())).toBe(true);
  });

  it("counts the due date day itself (inclusive)", () => {
    expect(answerSheetMeetsDueDate(listSheet(), answer({
      date: "2026-07-31T00:00:00.000Z",
    }))).toBe(true);
  });

  it("counts the creation day itself even though createdAt has a time component", () => {
    expect(answerSheetMeetsDueDate(listSheet(), answer({
      date: "2026-07-01T00:00:00.000Z",
    }))).toBe(true);
  });

  it("is not met when dated after the due date", () => {
    expect(answerSheetMeetsDueDate(listSheet(), answer({
      date: "2026-08-01T00:00:00.000Z",
    }))).toBe(false);
  });

  it("is not met when dated before the sheet was created", () => {
    expect(answerSheetMeetsDueDate(listSheet(), answer({
      date: "2026-06-30T00:00:00.000Z",
    }))).toBe(false);
  });

  it("is not met when incomplete, even if dated in the window", () => {
    expect(answerSheetMeetsDueDate(listSheet(), answer({
      entries: [entry("q1", "答え1")],
    }))).toBe(false);
  });

  it("is not met when the attempt has no date", () => {
    expect(answerSheetMeetsDueDate(listSheet(), answer({
      date: null,
    }))).toBe(false);
  });

  it("is not met when the sheet has no due date", () => {
    expect(answerSheetMeetsDueDate(listSheet({
      dueDate: null,
    }), answer())).toBe(false);
  });
});

describe("dueDateMet", () => {
  it("is true when any attempt meets the due date", () => {
    const attempts = [
      answer({
        id: "late",
        date: "2026-08-05T00:00:00.000Z",
      }),
      answer({
        id: "ontime",
        date: "2026-07-10T00:00:00.000Z",
      }),
    ];
    expect(dueDateMet(listSheet(), attempts)).toBe(true);
  });

  it("is false when no attempt meets the due date", () => {
    const attempts = [
      answer({
        id: "late",
        date: "2026-08-05T00:00:00.000Z",
      }),
      answer({
        id: "incomplete",
        entries: [entry("q1", "答え1")],
      }),
    ];
    expect(dueDateMet(listSheet(), attempts)).toBe(false);
  });

  it("is false with no attempts", () => {
    expect(dueDateMet(listSheet(), [])).toBe(false);
  });
});

describe("resourceFilterOptions", () => {
  it("collects distinct bookmarks with an 'all' sentinel first", () => {
    const options = resourceFilterOptions([
      listSheet({
        id: "a",
        bookmarkId: "b1",
        bookmarkTitle: "Genki I",
      }),
      listSheet({
        id: "b",
        bookmarkId: "b1",
        bookmarkTitle: "Genki I",
      }),
      listSheet({
        id: "c",
        bookmarkId: "b2",
        bookmarkTitle: "Tobira",
      }),
      listSheet({
        id: "d",
        bookmarkId: null,
      }),
    ]);
    expect(options).toEqual([
      {
        value: "all",
        label: "All resources",
      },
      {
        value: "b1",
        label: "Genki I",
      },
      {
        value: "b2",
        label: "Tobira",
      },
    ]);
  });

  it("returns only the sentinel when no sheet has a resource", () => {
    expect(resourceFilterOptions([listSheet()])).toEqual([
      {
        value: "all",
        label: "All resources",
      },
    ]);
  });
});

describe("matchesResource", () => {
  it("passes everything for the 'all' sentinel", () => {
    expect(matchesResource(listSheet({
      bookmarkId: "b1",
    }), "all")).toBe(true);
    expect(matchesResource(undefined, "all")).toBe(true);
  });

  it("matches on bookmarkId", () => {
    expect(matchesResource(listSheet({
      bookmarkId: "b1",
    }), "b1")).toBe(true);
    expect(matchesResource(listSheet({
      bookmarkId: "b2",
    }), "b1")).toBe(false);
  });

  it("does not match an undefined parent when a resource is selected", () => {
    expect(matchesResource(undefined, "b1")).toBe(false);
  });
});

describe("matchesLearningArea", () => {
  it("passes everything for the 'all' sentinel", () => {
    expect(matchesLearningArea(listSheet(), "all")).toBe(true);
    expect(matchesLearningArea(undefined, "all")).toBe(true);
  });

  it("matches when the sheet includes the area", () => {
    expect(matchesLearningArea(listSheet({
      learningAreas: ["Grammar", "Vocabulary"],
    }), "Grammar")).toBe(true);
    expect(matchesLearningArea(listSheet({
      learningAreas: ["Grammar"],
    }), "Reading")).toBe(false);
  });

  it("does not match an undefined parent when an area is selected", () => {
    expect(matchesLearningArea(undefined, "Grammar")).toBe(false);
  });
});

describe("entry state helpers", () => {
  it("isEntryTouched is false for a blank entry and true for any filled field", () => {
    expect(isEntryTouched(entry("s1", ""))).toBe(false);
    expect(isEntryTouched(entry("s1", "答え"))).toBe(true);
    expect(isEntryTouched({
      ...entry("s1", ""),
      correct: true,
    })).toBe(true);
    expect(isEntryTouched({
      ...entry("s1", ""),
      reasoning: "particle mix-up",
    })).toBe(true);
    expect(isEntryTouched({
      ...entry("s1", ""),
      correction: "   ",
    })).toBe(false);
  });

  it("hasCorrectionDetail requires a correction-side field, not just an answer", () => {
    expect(hasCorrectionDetail(entry("s1", "答え"))).toBe(false);
    expect(hasCorrectionDetail({
      ...entry("s1", "答え"),
      intendedMeaning: "what I meant",
    })).toBe(true);
  });

  it("isEntryAnswered accepts an answer, a verdict, or a correction", () => {
    expect(isEntryAnswered(entry("s1", ""))).toBe(false);
    expect(isEntryAnswered(entry("s1", "答え"))).toBe(true);
    expect(isEntryAnswered({
      ...entry("s1", ""),
      correct: false,
    })).toBe(true);
    expect(isEntryAnswered({
      ...entry("s1", ""),
      correction: "直した",
    })).toBe(true);
  });
});

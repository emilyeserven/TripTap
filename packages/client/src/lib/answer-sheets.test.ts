import type { AnswerSheet, AnswerSheetEntry, QuestionSheet } from "@sentence-bank/types";

import { describe, expect, it } from "vitest";

import {
  answerSheetMeetsDueDate,
  answerSheetPartScores,
  answerSheetScore,
  dueDateMet,
  generateAnswerSheetTitle,
  isAnswerSheetComplete,
  matchesLearningArea,
  hasCorrectionDetail,
  isEntryAnswered,
  isEntryTouched,
  matchesResource,
  questionSheetSlots,
  resourceFilterOptions,
  visibleSlots,
} from "./answer-sheets";

function entry(slotId: string, value: string, correct: boolean | null = null): AnswerSheetEntry {
  return {
    slotId,
    value,
    correct,
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
    sections: [],
    dueDate: "2026-07-31T00:00:00.000Z",
    firstQuestionNumber: 1,
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
    hiddenPartIds: null,
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

describe("answerSheetScore", () => {
  it("tallies correct, graded, and total across the sheet's slots", () => {
    const score = answerSheetScore(listSheet(), answer({
      entries: [entry("q1", "答え1", true), entry("q2", "答え2", false)],
    }));
    expect(score).toEqual({
      correct: 1,
      graded: 2,
      total: 2,
    });
  });

  it("counts total from the question sheet's slots, not the entries", () => {
    // Only one slot graded; the other is unanswered, so graded < total.
    const score = answerSheetScore(listSheet(), answer({
      entries: [entry("q1", "答え1", true)],
    }));
    expect(score).toEqual({
      correct: 1,
      graded: 1,
      total: 2,
    });
  });

  it("reports zero graded when nothing has a verdict yet", () => {
    expect(answerSheetScore(listSheet(), answer()).graded).toBe(0);
  });

  it("excludes hidden parts from correct, graded, and total", () => {
    const score = answerSheetScore(listSheet(), answer({
      entries: [entry("q1", "答え1", true), entry("q2", "答え2", false)],
      hiddenPartIds: ["q2"],
    }));
    expect(score).toEqual({
      correct: 1,
      graded: 1,
      total: 1,
    });
  });
});

describe("hidden parts", () => {
  it("visibleSlots drops slots in hidden parts", () => {
    expect(visibleSlots(listSheet(), answer({
      hiddenPartIds: ["q2"],
    })).map(s => s.id)).toEqual(["q1"]);
  });

  it("isAnswerSheetComplete ignores a hidden part's unanswered slot", () => {
    // q2 is blank, but hidden — so the attempt still counts as complete.
    expect(isAnswerSheetComplete(listSheet(), answer({
      entries: [entry("q1", "答え1")],
      hiddenPartIds: ["q2"],
    }))).toBe(true);
  });
});

describe("answerSheetPartScores", () => {
  it("scores each top-level question separately and flags hidden parts", () => {
    const scores = answerSheetPartScores(listSheet(), answer({
      entries: [entry("q1", "答え1", true), entry("q2", "答え2", false)],
      hiddenPartIds: ["q2"],
    }));
    expect(scores).toEqual([
      {
        questionId: "q1",
        label: "One",
        correct: 1,
        graded: 1,
        total: 1,
        hidden: false,
      },
      {
        questionId: "q2",
        label: "Two",
        correct: 0,
        graded: 1,
        total: 1,
        hidden: true,
      },
    ]);
  });
});

describe("generateAnswerSheetTitle", () => {
  const when = new Date("2026-07-15T12:00:00.000Z");

  it("uses the sheet title + date when every part is included", () => {
    expect(generateAnswerSheetTitle(listSheet(), [], when))
      .toBe(`Genki L3 — ${when.toLocaleDateString()}`);
  });

  it("names the included parts when a strict subset is in play", () => {
    // Two parts, q2 hidden → only Part 1 included.
    expect(generateAnswerSheetTitle(listSheet(), ["q2"], when))
      .toBe(`Genki L3 — Part 1 — ${when.toLocaleDateString()}`);
  });

  it("lists multiple included parts by their sheet position", () => {
    const sheet = listSheet({
      questions: [
        {
          id: "q1",
          prompt: "One",
        },
        {
          id: "q2",
          prompt: "Two",
        },
        {
          id: "q3",
          prompt: "Three",
        },
      ],
    });
    // q2 hidden → Parts 1 and 3 remain.
    expect(generateAnswerSheetTitle(sheet, ["q2"], when))
      .toBe(`Genki L3 — Parts 1, 3 — ${when.toLocaleDateString()}`);
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

describe("questionSheetSlots", () => {
  it("makes one slot per question when a question has no parts", () => {
    const slots = questionSheetSlots(listSheet());
    expect(slots).toEqual([
      {
        id: "q1",
        label: "One",
        choices: null,
      },
      {
        id: "q2",
        label: "Two",
        choices: null,
      },
    ]);
  });

  it("falls back to a positional label for a blank prompt", () => {
    const slots = questionSheetSlots(listSheet({
      questions: [{
        id: "q1",
        prompt: "  ",
      }],
    }));
    expect(slots).toEqual([{
      id: "q1",
      label: "Question 1",
      choices: null,
    }]);
  });

  it("carries a boolean question's True/False options onto its slot", () => {
    const slots = questionSheetSlots(listSheet({
      questions: [{
        id: "q1",
        prompt: "It is raining.",
        answerType: "boolean",
      }],
    }));
    expect(slots).toEqual([{
      id: "q1",
      label: "It is raining.",
      choices: ["True", "False"],
    }]);
  });

  it("carries a choice question's options onto every leaf slot, dropping blanks", () => {
    const slots = questionSheetSlots(listSheet({
      questions: [{
        id: "q1",
        prompt: "Pick the particle",
        answerType: "choice",
        choices: ["は", "  ", "が", "を"],
        parts: [
          {
            id: "p1",
            label: "(a)",
          },
          {
            id: "p2",
            label: "(b)",
          },
        ],
      }],
    }));
    expect(slots).toEqual([
      {
        id: "p1",
        label: "Pick the particle — (a)",
        choices: ["は", "が", "を"],
      },
      {
        id: "p2",
        label: "Pick the particle — (b)",
        choices: ["は", "が", "を"],
      },
    ]);
  });

  it("treats a choice question with no non-blank options as free text", () => {
    const slots = questionSheetSlots(listSheet({
      questions: [{
        id: "q1",
        prompt: "Anything",
        answerType: "choice",
        choices: ["  ", ""],
      }],
    }));
    expect(slots[0].choices).toBeNull();
  });

  it("offsets positional labels by firstQuestionNumber", () => {
    const slots = questionSheetSlots(listSheet({
      firstQuestionNumber: 8,
      questions: [
        {
          id: "q1",
          prompt: "  ",
        },
        {
          id: "q2",
          prompt: "",
        },
      ],
    }));
    expect(slots.map(s => s.label)).toEqual(["Question 8", "Question 9"]);
  });

  it("makes one slot per flat part, labelled with the prompt and part label", () => {
    const slots = questionSheetSlots(listSheet({
      questions: [{
        id: "q1",
        prompt: "Conjugate",
        parts: [
          {
            id: "p1",
            label: "(a)",
          },
          {
            id: "p2",
            label: "(b)",
          },
        ],
      }],
    }));
    expect(slots).toEqual([
      {
        id: "p1",
        label: "Conjugate — (a)",
        choices: null,
      },
      {
        id: "p2",
        label: "Conjugate — (b)",
        choices: null,
      },
    ]);
  });

  it("recurses to leaves: a part with sub-parts is a heading, only its leaves are slots", () => {
    const slots = questionSheetSlots(listSheet({
      questions: [{
        id: "q1",
        prompt: "Q",
        parts: [
          {
            id: "p1",
            label: "(a)",
            parts: [
              {
                id: "p1i",
                label: "(i)",
              },
              {
                id: "p1ii",
                label: "(ii)",
              },
            ],
          },
          {
            id: "p2",
            label: "(b)",
          },
        ],
      }],
    }));
    expect(slots).toEqual([
      {
        id: "p1i",
        label: "Q — (a) — (i)",
        choices: null,
      },
      {
        id: "p1ii",
        label: "Q — (a) — (ii)",
        choices: null,
      },
      {
        id: "p2",
        label: "Q — (b)",
        choices: null,
      },
    ]);
  });
});

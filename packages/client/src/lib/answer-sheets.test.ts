import type { AnswerSheet, AnswerSheetEntry, QuestionSheet } from "@sentence-bank/types";

import { describe, expect, it } from "vitest";

import {
  answerSheetMeetsDueDate,
  answerSheetPartScores,
  answerSheetScore,
  answerSheetSectionDateLabel,
  answerSheetTitleWithoutResource,
  dueDateMet,
  generateAnswerSheetTitle,
  groupAnswerSheetsByResource,
  isAnswerSheetComplete,
  matchesLearningArea,
  hasCorrectionDetail,
  isEntryAnswered,
  isEntryTouched,
  matchesResource,
  questionLeafSlots,
  questionSheetDisplayTitle,
  questionSheetPartSlots,
  questionSheetProgress,
  questionSheetSlots,
  resourceFilterOptions,
  visibleSlots,
} from "./answer-sheets";
import { formatDueDate } from "./due-date";

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

/**
 * A sheet that keeps per-question parts: q1 has sub-parts (a)/(b), q2 is flat. Because at least one
 * question has sub-parts, {@link questionSheetPartSlots} reports two parts (q1 owning pa+pb, q2 owning
 * itself) rather than collapsing — unlike {@link listSheet}, whose flat questions collapse to one part.
 */
function partedSheet(overrides: Partial<QuestionSheet> = {}): QuestionSheet {
  return listSheet({
    questions: [
      {
        id: "q1",
        prompt: "One",
        parts: [
          {
            id: "pa",
            label: "(a)",
          },
          {
            id: "pb",
            label: "(b)",
          },
        ],
      },
      {
        id: "q2",
        prompt: "Two",
      },
    ],
    ...overrides,
  });
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
    // Hiding part q2 drops its slot; only q1's slots (pa, pb) remain in play.
    const score = answerSheetScore(partedSheet(), answer({
      entries: [entry("pa", "答えa", true), entry("q2", "答え2", false)],
      hiddenPartIds: ["q2"],
    }));
    expect(score).toEqual({
      correct: 1,
      graded: 1,
      total: 2,
    });
  });
});

describe("hidden parts", () => {
  it("visibleSlots drops slots in hidden parts", () => {
    expect(visibleSlots(partedSheet(), answer({
      hiddenPartIds: ["q2"],
    })).map(s => s.id)).toEqual(["pa", "pb"]);
  });

  it("isAnswerSheetComplete ignores a hidden part's unanswered slot", () => {
    // q2 is blank, but hidden — so the attempt still counts as complete once pa/pb are filled.
    expect(isAnswerSheetComplete(partedSheet(), answer({
      entries: [entry("pa", "答えa"), entry("pb", "答えb")],
      hiddenPartIds: ["q2"],
    }))).toBe(true);
  });
});

describe("questionSheetPartSlots", () => {
  it("collapses a sheet with no sub-parts to a single whole-sheet part", () => {
    expect(questionSheetPartSlots(listSheet())).toEqual([
      {
        id: "all",
        label: "All questions",
        slotIds: ["q1", "q2"],
      },
    ]);
  });

  it("keeps a part per top-level question once any question has sub-parts", () => {
    expect(questionSheetPartSlots(partedSheet())).toEqual([
      {
        id: "q1",
        label: "One",
        slotIds: ["pa", "pb"],
      },
      {
        id: "q2",
        label: "Two",
        slotIds: ["q2"],
      },
    ]);
  });

  it("reports a single 'grid' part for grid layout", () => {
    const grid = listSheet({
      layout: "grid",
      grid: {
        columns: ["A"],
        rows: [{
          id: "r1",
          label: "Row 1",
        }],
      },
    });
    expect(questionSheetPartSlots(grid).map(p => p.id)).toEqual(["grid"]);
  });
});

describe("answerSheetPartScores", () => {
  it("scores each top-level question separately and flags hidden parts", () => {
    // q1 (parts a/b) and q2 (flat) stay distinct parts because q1 has sub-parts.
    const scores = answerSheetPartScores(partedSheet(), answer({
      entries: [entry("pa", "答えa", true), entry("pb", "答えb", true), entry("q2", "答え2", false)],
      hiddenPartIds: ["q2"],
    }));
    expect(scores).toEqual([
      {
        questionId: "q1",
        label: "One",
        correct: 2,
        graded: 2,
        total: 2,
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

  it("reports a flat sheet as one whole-sheet part", () => {
    const scores = answerSheetPartScores(listSheet(), answer({
      entries: [entry("q1", "答え1", true), entry("q2", "答え2", false)],
    }));
    expect(scores).toEqual([
      {
        questionId: "all",
        label: "All questions",
        correct: 1,
        graded: 2,
        total: 2,
        hidden: false,
      },
    ]);
  });
});

describe("questionSheetDisplayTitle", () => {
  it("returns the stored title when there is no resource + section", () => {
    expect(questionSheetDisplayTitle(listSheet())).toBe("Genki L3");
    // Resource but no sections → still the stored title.
    expect(questionSheetDisplayTitle(listSheet({
      bookmarkTitle: "Genki I",
    }))).toBe("Genki L3");
  });

  it("builds 'resource — section(s)' when both are attached, ignoring the stored title", () => {
    expect(questionSheetDisplayTitle(listSheet({
      title: "my messy title",
      bookmarkTitle: "Genki I",
      sections: [{
        id: "s1",
        label: "L3 vocab",
        type: "page",
        startValue: null,
        endValue: null,
      }],
    }))).toBe("Genki I — L3 vocab");
  });

  it("summarizes multiple sections as a 'first – last' range (stored order)", () => {
    expect(questionSheetDisplayTitle(listSheet({
      bookmarkTitle: "Genki I",
      sections: [
        {
          id: "s1",
          label: "L3",
          type: "page",
          startValue: null,
          endValue: null,
        },
        {
          id: "s2",
          label: "L4",
          type: "page",
          startValue: null,
          endValue: null,
        },
        {
          id: "s3",
          label: "L5",
          type: "page",
          startValue: null,
          endValue: null,
        },
      ],
    }))).toBe("Genki I — L3 – L5");
  });
});

describe("answerSheetTitleWithoutResource", () => {
  it("strips a leading resource-title prefix and its separator", () => {
    expect(answerSheetTitleWithoutResource("Genki I — L3 vocab — 8/1/2026", "Genki I"))
      .toBe("L3 vocab — 8/1/2026");
  });

  it("matches the prefix case-insensitively", () => {
    expect(answerSheetTitleWithoutResource("GENKI I — 8/1/2026", "Genki I")).toBe("8/1/2026");
  });

  it("handles en-dash and hyphen separators", () => {
    expect(answerSheetTitleWithoutResource("Tobira – Lesson 2", "Tobira")).toBe("Lesson 2");
    expect(answerSheetTitleWithoutResource("Tobira - Lesson 2", "Tobira")).toBe("Lesson 2");
  });

  it("returns the full title when it doesn't start with the resource", () => {
    expect(answerSheetTitleWithoutResource("My custom attempt", "Genki I")).toBe("My custom attempt");
  });

  it("returns the full title when there's no resource, keeping the fallback for a null title", () => {
    expect(answerSheetTitleWithoutResource("Genki I — 8/1/2026", null)).toBe("Genki I — 8/1/2026");
    expect(answerSheetTitleWithoutResource(null, null)).toBe("Answer sheet");
  });

  it("keeps the full title when stripping would leave nothing", () => {
    expect(answerSheetTitleWithoutResource("Genki I", "Genki I")).toBe("Genki I");
  });
});

describe("answerSheetSectionDateLabel", () => {
  const section = (id: string, label: string) => ({
    id,
    label,
    type: "name" as const,
    startValue: null,
    endValue: null,
  });
  const dated = "2026-08-01T00:00:00.000Z";

  it("uses the parent's section name plus the attempt's date", () => {
    const qs = listSheet({
      bookmarkTitle: "Genki I",
      sections: [section("s1", "L3 vocab")],
    });
    expect(answerSheetSectionDateLabel(answer({
      date: dated,
    }), qs)).toBe(`L3 vocab — ${formatDueDate(dated)}`);
  });

  it("joins multiple section names", () => {
    const qs = listSheet({
      bookmarkTitle: "Genki I",
      sections: [section("s1", "L3"), section("s2", "L4")],
    });
    expect(answerSheetSectionDateLabel(answer({
      date: dated,
    }), qs)).toBe(`L3, L4 — ${formatDueDate(dated)}`);
  });

  it("falls back to the resource-stripped title when the sheet has no sections", () => {
    const qs = listSheet({
      title: "Genki I — Chapter 3",
      bookmarkTitle: "Genki I",
      sections: [],
    });
    expect(answerSheetSectionDateLabel(answer({
      date: dated,
    }), qs)).toBe(`Chapter 3 — ${formatDueDate(dated)}`);
  });

  it("omits the date when the attempt isn't dated", () => {
    const qs = listSheet({
      bookmarkTitle: "Genki I",
      sections: [section("s1", "L3 vocab")],
    });
    expect(answerSheetSectionDateLabel(answer({
      date: null,
    }), qs)).toBe("L3 vocab");
  });

  it("uses the attempt title when the parent question sheet is missing", () => {
    expect(answerSheetSectionDateLabel(answer({
      title: "Some attempt",
      date: null,
    }), undefined)).toBe("Some attempt");
  });
});

describe("generateAnswerSheetTitle", () => {
  const when = new Date("2026-07-15T12:00:00.000Z");

  it("uses the sheet title + date when every part is included", () => {
    expect(generateAnswerSheetTitle(listSheet(), [], when))
      .toBe(`Genki L3 — ${when.toLocaleDateString()}`);
  });

  it("uses the resource + section as the base when the sheet has them", () => {
    const sheet = listSheet({
      title: "ignored",
      bookmarkTitle: "Genki I",
      sections: [{
        id: "s1",
        label: "L3 vocab",
        type: "page",
        startValue: null,
        endValue: null,
      }],
    });
    expect(generateAnswerSheetTitle(sheet, [], when))
      .toBe(`Genki I — L3 vocab — ${when.toLocaleDateString()}`);
  });

  it("names the included parts when a strict subset is in play", () => {
    // Two parts (q1 has sub-parts, so parts survive), q2 hidden → only Part 1 included.
    expect(generateAnswerSheetTitle(partedSheet(), ["q2"], when))
      .toBe(`Genki L3 — Part 1 — ${when.toLocaleDateString()}`);
  });

  it("lists multiple included parts by their sheet position", () => {
    const sheet = listSheet({
      questions: [
        {
          id: "q1",
          prompt: "One",
          parts: [{
            id: "pa",
            label: "(a)",
          }],
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

  it("does not annotate parts for a flat sheet, even with a stale hidden id", () => {
    // A flat sheet collapses to one whole-sheet part, so there are no parts to name.
    expect(generateAnswerSheetTitle(listSheet(), ["q2"], when))
      .toBe(`Genki L3 — ${when.toLocaleDateString()}`);
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

describe("questionSheetProgress", () => {
  it("is not-started with no attempts", () => {
    expect(questionSheetProgress(listSheet(), [])).toBe("not-started");
  });

  it("is not-started when the only attempt has no answers", () => {
    expect(questionSheetProgress(listSheet(), [answer({
      entries: [],
    })])).toBe("not-started");
  });

  it("is in-progress when an attempt has some but not all answers", () => {
    expect(questionSheetProgress(listSheet(), [answer({
      entries: [entry("q1", "答え1")],
    })])).toBe("in-progress");
  });

  it("is finished when an attempt fills every slot", () => {
    expect(questionSheetProgress(listSheet(), [answer()])).toBe("finished");
  });

  it("prefers finished when any attempt is complete", () => {
    expect(questionSheetProgress(listSheet(), [
      answer({
        id: "partial",
        entries: [entry("q1", "答え1")],
      }),
      answer({
        id: "done",
      }),
    ])).toBe("finished");
  });

  it("ignores attempts belonging to other question sheets", () => {
    expect(questionSheetProgress(listSheet(), [answer({
      id: "elsewhere",
      questionSheetId: "other-qs",
      entries: [entry("q1", "答え1"), entry("q2", "答え2")],
    })])).toBe("not-started");
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

describe("groupAnswerSheetsByResource", () => {
  const parentSheet = (id: string, bookmarkId: string | null, overrides: Partial<QuestionSheet> = {}) =>
    listSheet({
      id,
      bookmarkId,
      bookmarkTitle: bookmarkId,
      ...overrides,
    });

  it("buckets by the parent question sheet's bookmark, no-resource last", () => {
    const parents = new Map([
      ["qa", parentSheet("qa", "book-a")],
      ["qb", parentSheet("qb", "book-b")],
      ["qn", parentSheet("qn", null)],
    ]);
    const groups = groupAnswerSheetsByResource(
      [
        answer({
          id: "a1",
          questionSheetId: "qa",
        }),
        answer({
          id: "n1",
          questionSheetId: "qn",
        }),
        answer({
          id: "b1",
          questionSheetId: "qb",
        }),
        answer({
          id: "a2",
          questionSheetId: "qa",
        }),
      ],
      parents,
      new Map(),
    );
    expect(groups.map(g => g.bookmarkId)).toEqual(["book-a", "book-b", null]);
    expect(groups[0].answerSheets.map(a => a.id)).toEqual(["a1", "a2"]);
    expect(groups[2].answerSheets.map(a => a.id)).toEqual(["n1"]);
  });

  it("treats an attempt whose parent is missing as no-resource", () => {
    const groups = groupAnswerSheetsByResource(
      [answer({
        id: "orphan",
        questionSheetId: "gone",
      })],
      new Map(),
      new Map(),
    );
    expect(groups.map(g => g.bookmarkId)).toEqual([null]);
    expect(groups[0].answerSheets.map(a => a.id)).toEqual(["orphan"]);
  });

  it("orders attempts within a book by their parent's TOC position, keeping same-parent order", () => {
    const section = (id: string) => [{
      id,
      label: id,
      type: "name" as const,
      startValue: null,
      endValue: null,
    }];
    const parents = new Map([
      ["q-s1", parentSheet("q-s1", "book-a", {
        sections: section("s1"),
      })],
      ["q-s2", parentSheet("q-s2", "book-a", {
        sections: section("s2"),
      })],
      ["q-s3", parentSheet("q-s3", "book-a", {
        sections: section("s3"),
      })],
    ]);
    const toc = new Map([["book-a", new Map([["s1", 0], ["s2", 1], ["s3", 2]])]]);
    const groups = groupAnswerSheetsByResource(
      [
        answer({
          id: "a-s3",
          questionSheetId: "q-s3",
        }),
        answer({
          id: "a-s2a",
          questionSheetId: "q-s2",
        }),
        answer({
          id: "a-s1",
          questionSheetId: "q-s1",
        }),
        answer({
          id: "a-s2b",
          questionSheetId: "q-s2",
        }),
      ],
      parents,
      toc,
    );
    // s1 < s2 < s3 by TOC; the two s2 attempts keep their incoming order (a-s2a before a-s2b).
    expect(groups[0].answerSheets.map(a => a.id)).toEqual(["a-s1", "a-s2a", "a-s2b", "a-s3"]);
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

describe("questionLeafSlots", () => {
  it("returns a single unlabelled slot for a question with no parts", () => {
    expect(questionLeafSlots({
      id: "q1",
      prompt: "One",
    })).toEqual([{
      id: "q1",
      label: "",
    }]);
  });

  it("labels flat parts by their own label, without the prompt", () => {
    expect(questionLeafSlots({
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
    })).toEqual([
      {
        id: "p1",
        label: "(a)",
      },
      {
        id: "p2",
        label: "(b)",
      },
    ]);
  });

  it("recurses through sub-sub parts, chaining part labels and skipping headings", () => {
    expect(questionLeafSlots({
      id: "q2",
      prompt: "II",
      parts: [
        {
          id: "h1",
          label: "(1)",
          parts: [
            {
              id: "l1i",
              label: "(i)",
            },
            {
              id: "l1ii",
              label: "(ii)",
            },
          ],
        },
        {
          id: "h2",
          label: "(2)",
          parts: [{
            id: "l2i",
            label: "(i)",
          }],
        },
      ],
    })).toEqual([
      {
        id: "l1i",
        label: "(1) — (i)",
      },
      {
        id: "l1ii",
        label: "(1) — (ii)",
      },
      {
        id: "l2i",
        label: "(2) — (i)",
      },
    ]);
  });
});

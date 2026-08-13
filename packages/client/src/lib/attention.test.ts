import type {
  AnswerSheet,
  AttentionKind,
  CorrectionLog,
  CorrectionRuleGapGroup,
  DrillSession,
  HiddenAttentionItem,
  Lesson,
  Sentence,
  QuestionSheet,
  ReadingSession,
  RuleGroup,
  WordNote,
  Writing,
} from "@sentence-bank/types";

import { describe, expect, it } from "vitest";

import {
  ATTENTION_GROUP_DISPLAY_LIMIT,
  buildAttention,
  dueSheets,
  flashcardsPending,
  hiddenItemKey,
  recurringDrills,
  rewriteReady,
  ruleGroupsReady,
  sentencesToCorrect,
  toHiddenItem,
  ungradedSheets,
  wordNotesToBank,
} from "./attention";

import { makeSentence } from "@/test-utils/sentence";

const NOW = new Date("2026-08-09T12:00:00Z");

const emptyInputs = {
  mySentences: [],
  questionSheets: [],
  answerSheets: [],
  readingSessions: [],
  lessons: [],
  drillSessions: [],
  correctionLog: null,
  ruleGroups: [],
  writings: [],
  now: NOW,
};

/** A hide-list entry for a row, as the inbox page stores it. */
function hiddenItem(kind: AttentionKind, id: string): HiddenAttentionItem {
  return {
    kind,
    id,
    title: id,
    hiddenAt: "2026-08-08T00:00:00Z",
  };
}

function mySentence(over: Partial<Sentence>): Sentence {
  return makeSentence({
    id: "ms1",
    kind: "mine",
    text: "日本語で書いた文",
    translation: null,
    needsCorrection: true,
    createdAt: "2026-08-07T00:00:00Z",
    ...over,
  });
}

/** A one-question list sheet — a single answerable slot with the question's id. */
function questionSheet(over: Partial<QuestionSheet>): QuestionSheet {
  return {
    id: "qs1",
    title: "Particles",
    layout: "list",
    questions: [{
      id: "q1",
      prompt: "Fill in the particle",
      parts: null,
      answerType: null,
    }],
    grid: null,
    firstQuestionNumber: null,
    learningAreas: [],
    sections: [],
    grammarTerms: null,
    dueDate: null,
    bookmarkId: null,
    bookmarkTitle: null,
    bookmarkUrl: null,
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z",
    ...over,
  } as unknown as QuestionSheet;
}

function answerSheet(over: Partial<AnswerSheet>): AnswerSheet {
  return {
    id: "as1",
    questionSheetId: "qs1",
    title: "Attempt 1",
    date: null,
    entries: [],
    hiddenPartIds: null,
    createdAt: "2026-08-05T00:00:00Z",
    updatedAt: "2026-08-05T00:00:00Z",
    ...over,
  } as AnswerSheet;
}

function wordNote(over: Partial<WordNote>): WordNote {
  return {
    id: "w1",
    word: "難しい",
    reading: null,
    meaning: null,
    status: "shaky",
    flashcard: false,
    flashcardMadeAt: null,
    mySentenceId: null,
    ...over,
  };
}

function readingSession(over: Partial<ReadingSession>): ReadingSession {
  return {
    id: "rs1",
    date: "2026-08-05",
    title: "NHK Easy article",
    language: "Japanese",
    sourceId: null,
    page: null,
    mode: "freeform",
    difficulty: null,
    passive: false,
    timeSpentMinutes: 0,
    passage: null,
    freeformTranslation: null,
    freeformCorrection: null,
    freeformNote: null,
    freeformVerdict: null,
    summary: null,
    lines: null,
    wordNotes: null,
    learningArea: null,
    countsTowardXp: true,
    bookmarkId: null,
    bookmarkTitle: null,
    bookmarkUrl: null,
    createdAt: "2026-08-05T00:00:00Z",
    updatedAt: "2026-08-05T00:00:00Z",
    ...over,
  } as ReadingSession;
}

function lesson(over: Partial<Lesson>): Lesson {
  return {
    id: "l1",
    title: null,
    date: "2026-08-04",
    language: "Japanese",
    tutorId: null,
    notes: null,
    listeningNotes: null,
    wordNotes: null,
    answerSheetIds: null,
    durationMinutes: 0,
    learningArea: null,
    countsTowardXp: true,
    createdAt: "2026-08-04T00:00:00Z",
    updatedAt: "2026-08-04T00:00:00Z",
    ...over,
  } as Lesson;
}

function drillSession(over: Partial<DrillSession>): DrillSession {
  return {
    id: "d1",
    date: "2026-08-08",
    title: null,
    notes: null,
    questions: 10,
    type: "multiple-choice",
    mistakes: [],
    learningArea: null,
    countsTowardXp: true,
    bookmarkId: null,
    bookmarkTitle: null,
    bookmarkUrl: null,
    createdAt: "2026-08-08T00:00:00Z",
    updatedAt: "2026-08-08T00:00:00Z",
    ...over,
  } as unknown as DrillSession;
}

function mistake(question: string) {
  return {
    id: `m-${question}`,
    question,
    prompt: "wrong answer",
    reasons: [],
  };
}

function ruleGap(over: Partial<CorrectionRuleGapGroup>): CorrectionRuleGapGroup {
  return {
    ruleTagKey: "particle-ni",
    ruleTagLabel: "に after time words",
    grammarTagId: null,
    grammarTagName: null,
    occurrenceCount: 3,
    lastSeenAt: "2026-08-08T00:00:00Z",
    meetsGate: true,
    corrections: [],
    ...over,
  };
}

function correctionLog(ruleGaps: CorrectionRuleGapGroup[]): CorrectionLog {
  return {
    gate: 2,
    ruleGaps,
    collocations: [],
    registers: [],
  };
}

function writing(over: Partial<Writing>): Writing {
  return {
    id: "wr1",
    date: "2026-07-30",
    text: "今日は暑かったです。",
    corrections: [{
      id: "c1",
      original: "暑かった",
      corrected: "暑かったです",
      note: null,
      marks: null,
      mySentenceId: null,
    }],
    readyToReview: false,
    terms: null,
    promptId: null,
    promptTitle: null,
    promptText: null,
    createdAt: "2026-07-30T00:00:00Z",
    updatedAt: "2026-07-30T00:00:00Z",
    ...over,
  } as unknown as Writing;
}

describe("sentencesToCorrect", () => {
  it("keeps only sentences flagged needsCorrection, newest first", () => {
    const items = sentencesToCorrect([
      mySentence({
        id: "old",
        createdAt: "2026-08-01T00:00:00Z",
      }),
      mySentence({
        id: "done",
        needsCorrection: false,
      }),
      mySentence({
        id: "new",
        createdAt: "2026-08-08T00:00:00Z",
      }),
    ], NOW);
    expect(items.map(i => i.id)).toEqual(["new", "old"]);
    expect(items[0].to).toBe("/sentences/$id");
  });
});

describe("ungradedSheets", () => {
  const qs = questionSheet({});
  it("flags complete attempts with ungraded slots", () => {
    const items = ungradedSheets([qs], [answerSheet({
      entries: [{
        slotId: "q1",
        value: "は",
        correct: null,
        correction: null,
        reasoning: null,
        intendedMeaning: null,
        actualMeaning: null,
        marks: null,
      }],
    })]);
    expect(items).toHaveLength(1);
    expect(items[0].detail).toBe("0 of 1 graded");
    expect(items[0].to).toBe("/answer-sheets/$id/edit");
  });

  it("skips incomplete and fully graded attempts", () => {
    const incomplete = answerSheet({
      id: "as-empty",
      entries: [],
    });
    const graded = answerSheet({
      id: "as-graded",
      entries: [{
        slotId: "q1",
        value: "は",
        correct: true,
        correction: null,
        reasoning: null,
        intendedMeaning: null,
        actualMeaning: null,
        marks: null,
      }],
    });
    expect(ungradedSheets([qs], [incomplete, graded])).toHaveLength(0);
  });
});

describe("wordNotesToBank", () => {
  it("counts word notes with no My Sentence, one item per session", () => {
    const items = wordNotesToBank([readingSession({
      wordNotes: [
        wordNote({}),
        wordNote({
          id: "w2",
          mySentenceId: "ms1",
        }),
      ],
    })]);
    expect(items).toHaveLength(1);
    expect(items[0].detail).toBe("1 word to bank");
  });

  it("skips sessions whose notes are all banked", () => {
    expect(wordNotesToBank([readingSession({
      wordNotes: [wordNote({
        mySentenceId: "ms1",
      })],
    })])).toHaveLength(0);
  });
});

describe("flashcardsPending", () => {
  it("counts flagged notes with no card made, across reading sessions and lessons", () => {
    const items = flashcardsPending(
      [readingSession({
        wordNotes: [
          wordNote({
            flashcard: true,
          }),
          wordNote({
            id: "w2",
            flashcard: true,
            flashcardMadeAt: "2026-08-06T00:00:00Z",
          }),
        ],
      })],
      [lesson({
        wordNotes: [{
          id: "lw1",
          word: "犬",
          reading: null,
          meaning: null,
          notes: null,
          status: "shaky",
          flashcard: true,
          flashcardMadeAt: null,
        }],
      })],
    );
    expect(items).toHaveLength(2);
    expect(items.find(i => i.to === "/reading-sessions/$id")?.detail).toBe("1 flashcard to make");
    expect(items.find(i => i.to === "/lessons/$id")?.title).toBe("Lesson — 2026-08-04");
  });

  it("treats a legacy note without the field as not made", () => {
    const legacy = wordNote({
      flashcard: true,
    });
    delete (legacy as Partial<WordNote>).flashcardMadeAt;
    expect(flashcardsPending([readingSession({
      wordNotes: [legacy],
    })], [])).toHaveLength(1);
  });

  it("ignores unflagged notes", () => {
    expect(flashcardsPending([readingSession({
      wordNotes: [wordNote({})],
    })], [])).toHaveLength(0);
  });
});

describe("recurringDrills", () => {
  it("flags questions missed in three recent sessions, not two", () => {
    const sessions = ["2026-08-07", "2026-08-08", "2026-08-09"].map((date, i) => drillSession({
      id: `d${i}`,
      date,
      mistakes: [mistake("これ vs それ")],
    }));
    expect(recurringDrills(sessions.slice(0, 2), NOW)).toHaveLength(0);
    const items = recurringDrills(sessions, NOW);
    expect(items).toHaveLength(1);
    expect(items[0].detail).toBe("missed in 3 drills");
  });
});

describe("ruleGroupsReady", () => {
  it("keeps gate-met gaps without an existing group", () => {
    const log = correctionLog([
      ruleGap({}),
      ruleGap({
        ruleTagKey: "built",
        occurrenceCount: 5,
      }),
      ruleGap({
        ruleTagKey: "under-gate",
        meetsGate: false,
      }),
    ]);
    const items = ruleGroupsReady(log, [{
      ruleTagKey: "built",
    } as RuleGroup]);
    expect(items.map(i => i.id)).toEqual(["particle-ni"]);
    expect(items[0].title).toBe("に after time words");
    expect(items[0].detail).toBe("3 strikes");
  });
});

describe("rewriteReady", () => {
  it("keeps corrected writings at least seven days old", () => {
    const items = rewriteReady([
      writing({}),
      writing({
        id: "young",
        createdAt: "2026-08-04T00:00:00Z",
      }),
      writing({
        id: "uncorrected",
        corrections: [],
      }),
    ], NOW);
    expect(items.map(i => i.id)).toEqual(["wr1"]);
    expect(items[0].detail).toContain("1 correction");
  });
});

describe("dueSheets", () => {
  it("surfaces unmet sheets due within the window, overdue as destructive", () => {
    const overdue = questionSheet({
      id: "qs-over",
      title: "Overdue",
      dueDate: "2026-08-08T00:00:00Z",
    });
    const upcoming = questionSheet({
      id: "qs-soon",
      title: "Soon",
      dueDate: "2026-08-12T00:00:00Z",
    });
    const far = questionSheet({
      id: "qs-far",
      title: "Far",
      dueDate: "2026-09-08T00:00:00Z",
    });
    const items = dueSheets([overdue, upcoming, far], [], NOW);
    expect(items.map(i => i.id)).toEqual(["qs-over", "qs-soon"]);
    expect(items[0].destructive).toBe(true);
    expect(items[1].destructive).toBe(false);
  });

  it("drops sheets met by a completed in-window attempt", () => {
    const qs = questionSheet({
      dueDate: "2026-08-12T00:00:00Z",
    });
    const met = answerSheet({
      date: "2026-08-05T00:00:00Z",
      entries: [{
        slotId: "q1",
        value: "は",
        correct: null,
        correction: null,
        reasoning: null,
        intendedMeaning: null,
        actualMeaning: null,
        marks: null,
      }],
    });
    expect(dueSheets([qs], [met], NOW)).toHaveLength(0);
  });
});

describe("buildAttention", () => {
  it("returns nothing for empty inputs", () => {
    expect(buildAttention(emptyInputs)).toEqual([]);
  });

  it("drops empty groups and keeps only populated kinds", () => {
    const groups = buildAttention({
      ...emptyInputs,
      mySentences: [mySentence({})],
    });
    expect(groups.map(g => g.kind)).toEqual(["sentence-correction"]);
    expect(groups[0].count).toBe(1);
  });

  it("caps displayed items while counting the total", () => {
    const many = Array.from({
      length: 8,
    }, (_, i) => mySentence({
      id: `ms${i}`,
    }));
    const [group] = buildAttention({
      ...emptyInputs,
      mySentences: many,
    });
    expect(group.items).toHaveLength(ATTENTION_GROUP_DISPLAY_LIMIT);
    expect(group.count).toBe(8);
  });

  it("drops hidden rows from their group before the cap, and from the count", () => {
    const many = Array.from({
      length: 8,
    }, (_, i) => mySentence({
      id: `ms${i}`,
    }));
    const [group] = buildAttention({
      ...emptyInputs,
      mySentences: many,
      hidden: {
        hiddenKinds: [],
        hiddenItems: [
          hiddenItem("sentence-correction", "ms0"),
          hiddenItem("sentence-correction", "ms1"),
        ],
      },
    });
    expect(group.count).toBe(6);
    expect(group.items.map(i => i.id)).not.toContain("ms0");
    expect(group.items).toHaveLength(ATTENTION_GROUP_DISPLAY_LIMIT);
  });

  it("only hides a row within its own kind (ids are unique per kind, not globally)", () => {
    const groups = buildAttention({
      ...emptyInputs,
      mySentences: [mySentence({
        id: "shared-id",
      })],
      hidden: {
        hiddenKinds: [],
        hiddenItems: [hiddenItem("rewrite-ready", "shared-id")],
      },
    });
    expect(groups.map(g => g.kind)).toEqual(["sentence-correction"]);
  });

  it("drops a hidden kind entirely, however many items it has", () => {
    const groups = buildAttention({
      ...emptyInputs,
      mySentences: [mySentence({}), mySentence({
        id: "ms2",
      })],
      hidden: {
        hiddenKinds: ["sentence-correction"],
        hiddenItems: [],
      },
    });
    expect(groups).toEqual([]);
  });
});

describe("hiddenItemKey", () => {
  it("keys by kind and id together", () => {
    expect(hiddenItemKey({
      kind: "rewrite-ready",
      id: "wr1",
    })).toBe("rewrite-ready:wr1");
    expect(hiddenItemKey({
      kind: "sentence-correction",
      id: "wr1",
    })).not.toBe(hiddenItemKey({
      kind: "rewrite-ready",
      id: "wr1",
    }));
  });
});

describe("toHiddenItem", () => {
  it("snapshots the row's kind, id, title and the time it was hidden", () => {
    const [item] = sentencesToCorrect([mySentence({})], NOW);
    expect(toHiddenItem(item, NOW)).toEqual({
      kind: "sentence-correction",
      id: "ms1",
      title: "日本語で書いた文",
      hiddenAt: NOW.toISOString(),
    });
  });
});

import type { BookmarkSectionRef, SentenceTermRef } from "./index.js";

/** How a question sheet's answerable slots are laid out. */
export type QuestionSheetLayout = "list" | "grid";

/** The language-learning skill areas a question sheet can be tagged with (a sheet may have several). */
export const LEARNING_AREAS = [
  "Speaking",
  "Listening",
  "Reading",
  "Writing",
  "Grammar",
  "Vocabulary",
] as const;

/** One skill area from {@link LEARNING_AREAS}. */
export type LearningArea = (typeof LEARNING_AREAS)[number];

/**
 * One labelled sub-part of a list question (e.g. "(a)", "(b)"). Parts nest recursively: a part with
 * no `parts` is a leaf and its own answer slot; a part that has `parts` is a heading whose leaf
 * descendants are the answer slots.
 */
export interface QuestionSheetPart {
  id: string;
  label: string;
  parts?: QuestionSheetPart[];
}

/** One question in a "list" layout. A question with no parts is a single slot; each part is a slot. */
export interface QuestionSheetQuestion {
  id: string;
  prompt: string;
  parts?: QuestionSheetPart[];
}

/** One row in a "grid" layout (e.g. one verb in a conjugation table). */
export interface QuestionSheetGridRow {
  id: string;
  label: string;
}

/** A "grid" layout: named columns and labelled rows; each row×column cell is an answer slot. */
export interface QuestionSheetGrid {
  columns: string[];
  rows: QuestionSheetGridRow[];
}

/**
 * A reusable template of textbook/worksheet exercises with no answer key. The same question sheet can
 * be answered many times via separate {@link AnswerSheet}s. Structure is stored flexibly as JSONB:
 * `layout === "list"` uses {@link QuestionSheetQuestion questions}; `layout === "grid"` uses
 * {@link QuestionSheetGrid grid}.
 */
export interface QuestionSheet {
  id: string;
  title: string;
  notes: string | null;
  /** Free-text location within the source, e.g. "p. 12–13", "ch. 3". */
  page: string | null;
  /** The specific worksheet/textbook bookmark this sheet is drawn from, from the "resource" channel. */
  bookmarkId: string | null;
  bookmarkTitle: string | null;
  bookmarkUrl: string | null;
  /** The specific sections of {@link bookmarkId} this sheet is drawn from (narrower references); empty when none. */
  sections: BookmarkSectionRef[];
  /** When this sheet should be answered by, if any. */
  dueDate: string | null;
  /**
   * The number the sheet's first list question is labelled with (default 1) — so a worksheet section
   * that starts at "Question 8" numbers its slots 8, 9, 10… Positional labels add this to the index.
   */
  firstQuestionNumber: number;
  /** Skill areas this sheet exercises; empty when untagged. Answer sheets inherit these from here. */
  learningAreas: LearningArea[];
  /**
   * Grammar-point tags (the bookmarks "grammar" channel) this sheet drills — the same tags sentences
   * and grammar notes use. Lets the sheet surface on the Grammar page; empty when untagged.
   */
  grammarTerms: SentenceTermRef[];
  layout: QuestionSheetLayout;
  /** Used when `layout === "list"`. */
  questions: QuestionSheetQuestion[];
  /** Used when `layout === "grid"`, else null. */
  grid: QuestionSheetGrid | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQuestionSheetInput {
  title: string;
  layout: QuestionSheetLayout;
  notes?: string | null;
  page?: string | null;
  bookmarkId?: string | null;
  bookmarkTitle?: string | null;
  bookmarkUrl?: string | null;
  sections?: BookmarkSectionRef[] | null;
  dueDate?: string | null;
  firstQuestionNumber?: number;
  learningAreas?: LearningArea[];
  grammarTerms?: SentenceTermRef[] | null;
  questions?: QuestionSheetQuestion[];
  grid?: QuestionSheetGrid | null;
}

export type UpdateQuestionSheetInput = Partial<CreateQuestionSheetInput>;

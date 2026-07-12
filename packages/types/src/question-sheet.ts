import type { SentenceTermRef } from "./index.js";

/** How a question sheet's answerable slots are laid out. */
export type QuestionSheetLayout = "list" | "grid";

/** One labelled sub-part of a list question (e.g. "(a)", "(b)"). Each part is its own answer slot. */
export interface QuestionSheetPart {
  id: string;
  label: string;
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
  /** Tags drawn from the "resource" (Textbooks & Worksheets) bookmarks channel. */
  resourceTerms: SentenceTermRef[] | null;
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
  resourceTerms?: SentenceTermRef[] | null;
  questions?: QuestionSheetQuestion[];
  grid?: QuestionSheetGrid | null;
}

export type UpdateQuestionSheetInput = Partial<CreateQuestionSheetInput>;

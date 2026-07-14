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
  /** Free-text location within the source, e.g. "p. 12–13", "ch. 3". */
  page: string | null;
  /** The specific worksheet/textbook bookmark this sheet is drawn from, from the "resource" channel. */
  bookmarkId: string | null;
  bookmarkTitle: string | null;
  bookmarkUrl: string | null;
  /** When this sheet should be answered by, if any. */
  dueDate: string | null;
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
  dueDate?: string | null;
  questions?: QuestionSheetQuestion[];
  grid?: QuestionSheetGrid | null;
}

export type UpdateQuestionSheetInput = Partial<CreateQuestionSheetInput>;

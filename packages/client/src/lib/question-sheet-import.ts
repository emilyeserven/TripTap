import type {
  QuestionSheetGridRow,
  QuestionSheetImport,
  QuestionSheetImportPart,
  QuestionSheetPart,
  QuestionSheetQuestion,
} from "@sentence-bank/types";

import { questionSheetImportSchema } from "@sentence-bank/types";

import { newSheetItemId } from "@/lib/question-sheet-parts";

/**
 * Fill a question sheet from photos: the copyable AI prompt, the parser for the JSON it returns, and the
 * converter that turns that id-free JSON into form-ready questions. The JSON contract itself is
 * `questionSheetImportSchema` in `@sentence-bank/types`; keep the prompt's description in step with it.
 */

/** Optional context the learner can give the AI so it fills the title/page the way they file sheets. */
export interface QuestionSheetPromptContext {
  /** The book/worksheet name, e.g. "Genki I Workbook". */
  resource?: string | null;
  /** The page(s), e.g. "p. 12". */
  page?: string | null;
}

/** The copyable prompt that asks an AI to read exercise photos and answer with importable JSON. */
export function buildQuestionSheetImportPrompt(context: QuestionSheetPromptContext = {}): string {
  const resource = context.resource?.trim();
  const page = context.page?.trim();
  const source = [
    resource ? `The exercise is from "${resource}".` : null,
    page ? `It is on ${page}.` : null,
  ].filter(Boolean).join(" ");

  return `I've attached photos/screenshots of a Japanese textbook or worksheet exercise. Turn them into JSON for my study app's question sheet so I can answer each question without the book open.${source ? `\n\n${source}` : ""}

Rules:
- Copy every question exactly as printed, in the original Japanese (keep kanji, kana and any furigana-free text as-is). Do NOT answer or solve anything.
- Write blanks as ＿＿ and keep any example sentence or word bank the question relies on.
- A numbered exercise becomes one entry in "questions". Its instructions go in "prompt" (translate them to English in brackets after the Japanese if they are only in Japanese).
- Each item inside an exercise — (a), (b), 1), ①… — becomes a "part" with its printed "label" and the item itself as "text". Items with their own sub-items nest under "parts" the same way; a heading part's "text" holds that group's instructions.
- A question with no sub-items has no "parts"; put the whole question in "prompt".
- True/false items: set "answerType": "boolean". Multiple choice: set "answerType": "choice" and list the options in "choices" (the options apply to every part of that question).
- If the exercise is a table to fill in (e.g. conjugation charts), use "layout": "grid" with "grid": { "columns": [column headings], "rows": [row labels] } instead of "questions".
- "firstQuestionNumber" is the number printed on the first exercise if it isn't 1.
- Leave out any field you can't fill. Reply with only the JSON, no commentary.

Shape:
{
  "title": "Book — Lesson/section name",
  "page": "p. 12",
  "notes": "Anything the instructions say that applies to the whole page (optional)",
  "firstQuestionNumber": 1,
  "layout": "list",
  "questions": [
    {
      "prompt": "Fill in the blanks with the correct particle.",
      "parts": [
        { "label": "(a)", "text": "東京＿＿行きます。" },
        { "label": "(b)", "text": "友だち＿＿映画を見ました。" }
      ]
    },
    {
      "prompt": "正しいものを選んでください。[Choose the correct one.]",
      "answerType": "choice",
      "choices": ["A", "B", "C"],
      "parts": [
        { "label": "1", "text": "きのう（A. 行く B. 行った C. 行って）。" }
      ]
    },
    { "prompt": "週末に何をしましたか。日本語で答えてください。" }
  ]
}`;
}

/** The outcome of parsing pasted AI output: the validated data, or human-readable errors. */
export type QuestionSheetImportResult
  = | { ok: true;
    data: QuestionSheetImport; }
    | { ok: false;
      errors: string[]; };

/** Strip a ```json … ``` fence the AI may wrap its answer in, leaving the bare JSON. */
function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```[a-zA-Z]*\s*\n([\s\S]*?)\n?```$/);
  return fenced ? fenced[1] : trimmed;
}

/** Parse and validate pasted AI output against `questionSheetImportSchema`. */
export function parseQuestionSheetImport(text: string): QuestionSheetImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFence(text));
  }
  catch (err) {
    return {
      ok: false,
      errors: [`Invalid JSON: ${(err as Error).message}`],
    };
  }
  const result = questionSheetImportSchema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      errors: result.error.issues
        .slice(0, 8)
        .map(i => `${i.path.join(".") || "(root)"}: ${i.message}`),
    };
  }
  return {
    ok: true,
    data: result.data,
  };
}

/** Give an imported part tree fresh ids, dropping blank text so it stays optional on the stored part. */
function toParts(parts: QuestionSheetImportPart[]): QuestionSheetPart[] {
  return parts.map((part) => {
    const out: QuestionSheetPart = {
      id: newSheetItemId("p"),
      label: part.label.trim(),
    };
    const text = part.text?.trim();
    if (text) out.text = text;
    if (part.parts && part.parts.length > 0) out.parts = toParts(part.parts);
    return out;
  });
}

/** The imported questions as form-ready {@link QuestionSheetQuestion}s with fresh ids. */
export function importedQuestions(data: QuestionSheetImport): QuestionSheetQuestion[] {
  return (data.questions ?? []).map((q) => {
    const out: QuestionSheetQuestion = {
      id: newSheetItemId("q"),
      prompt: q.prompt?.trim() ?? "",
    };
    if (q.parts && q.parts.length > 0) out.parts = toParts(q.parts);
    if (q.answerType && q.answerType !== "text") out.answerType = q.answerType;
    if (q.answerType === "choice" && q.choices) out.choices = q.choices;
    return out;
  });
}

/** The imported grid rows with fresh ids (empty when the import has no grid). */
export function importedGridRows(data: QuestionSheetImport): QuestionSheetGridRow[] {
  return (data.grid?.rows ?? []).map(label => ({
    id: newSheetItemId("r"),
    label: label.trim(),
  }));
}

/** The layout an import describes: an explicit `layout`, else grid when only a grid was sent. */
export function importedLayout(data: QuestionSheetImport): "list" | "grid" {
  if (data.layout) return data.layout;
  return data.grid && !(data.questions?.length) ? "grid" : "list";
}

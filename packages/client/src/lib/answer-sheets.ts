import type {
  AnswerSheet,
  AnswerSheetEntry,
  LearningArea,
  QuestionSheet,
  QuestionSheetPart,
} from "@sentence-bank/types";

import { questionAnswerChoices } from "@sentence-bank/types";

import { formatDueDate } from "@/lib/due-date";
import { compareSheetPosition } from "@/lib/question-sheets";

/** One answerable cell of a question sheet: a stable `id` and a human label for the input. */
export interface QuestionSheetSlot {
  id: string;
  label: string;
  /**
   * The button-group options this slot answers with (from its question's answer type), or `null` for
   * free text. Every leaf slot of a question shares the question's options.
   */
  choices: string[] | null;
}

/**
 * Walk a part subtree, appending one slot per **leaf** part (a part with no sub-parts). A part that has
 * sub-parts is a heading, not a slot — only its leaf descendants are answerable. `base` is the label
 * built from the ancestors so far (question prompt + any parent part labels). `choices` is the owning
 * question's answer options (or null), inherited by every leaf slot.
 */
function collectPartSlots(
  base: string,
  parts: QuestionSheetPart[],
  choices: string[] | null,
  slots: QuestionSheetSlot[],
): void {
  for (const part of parts) {
    const label = `${base} — ${part.label}`;
    if (part.parts && part.parts.length > 0) {
      collectPartSlots(label, part.parts, choices, slots);
    }
    else {
      slots.push({
        id: part.id,
        label,
        choices,
      });
    }
  }
}

/**
 * Flatten a question sheet into its answerable slots, in display order. This is the single source of
 * truth shared by the answer form (which renders one input per slot) and the read-only views.
 *
 * - `list` layout: a question with no parts is one slot (`id = q.id`); otherwise each **leaf** part is
 *   its own slot (`id = part.id`), labelled with the question prompt plus the chain of part labels. A
 *   part that has sub-parts is a heading, not a slot.
 * - `grid` layout: each row × column is a slot (`id = ` + "`${row.id}:${colIndex}`"), labelled with
 *   the row label and column heading.
 */
export function questionSheetSlots(qs: QuestionSheet): QuestionSheetSlot[] {
  if (qs.layout === "grid") {
    const grid = qs.grid;
    if (!grid) return [];
    const slots: QuestionSheetSlot[] = [];
    for (const row of grid.rows) {
      grid.columns.forEach((column, colIndex) => {
        slots.push({
          id: `${row.id}:${colIndex}`,
          label: `${row.label} · ${column}`,
          choices: null,
        });
      });
    }
    return slots;
  }

  const slots: QuestionSheetSlot[] = [];
  // Positional labels start at the sheet's configured first number (default 1), so a section that
  // begins at "Question 8" numbers its blank slots 8, 9, 10…
  const firstNumber = qs.firstQuestionNumber ?? 1;
  qs.questions.forEach((question, index) => {
    // Blank prompts (e.g. from the "quick fill" count shortcut) fall back to a positional label.
    const base = question.prompt.trim() || `Question ${firstNumber + index}`;
    const choices = questionAnswerChoices(question);
    if (question.parts && question.parts.length > 0) {
      collectPartSlots(base, question.parts, choices, slots);
    }
    else {
      slots.push({
        id: question.id,
        label: base,
        choices,
      });
    }
  });
  return slots;
}

/** One leaf answer slot of a single question, labelled by its chain of part labels (no prompt). */
export interface QuestionLeafSlot {
  id: string;
  /** The part-label chain, e.g. "(1) — (i)"; empty for a question with no parts (its own slot). */
  label: string;
}

/**
 * The leaf answer slots of one question, in order, each labelled by the chain of its part labels —
 * **without** the question prompt, which callers render separately. A question with no parts is a
 * single slot (`id = question.id`, empty label). Nested parts recurse to their leaves, so a sub-sub
 * part like (1) → (i) yields the label "(1) — (i)". A part that has sub-parts is a heading, not a slot.
 */
export function questionLeafSlots(question: QuestionSheet["questions"][number]): QuestionLeafSlot[] {
  const parts = question.parts ?? [];
  if (parts.length === 0) return [{
    id: question.id,
    label: "",
  }];
  const out: QuestionLeafSlot[] = [];
  const walk = (nodes: QuestionSheetPart[], prefix: string): void => {
    for (const node of nodes) {
      const label = prefix ? `${prefix} — ${node.label}` : node.label;
      const kids = node.parts ?? [];
      if (kids.length > 0) walk(kids, label);
      else out.push({
        id: node.id,
        label,
      });
    }
  };
  walk(parts, "");
  return out;
}

/** Leaf slot ids belonging to one top-level question (the question itself, or its leaf parts). */
function questionSlotIds(question: QuestionSheet["questions"][number]): string[] {
  return questionLeafSlots(question).map(s => s.id);
}

/** One selectable "part" of a question sheet — a top-level question. Empty for grid layout. */
export interface QuestionSheetPartRef {
  id: string;
  label: string;
}

/** A part with the answer-slot ids it owns — the source of truth for parts. Grid = one "grid" part. */
export interface QuestionSheetPartSlots extends QuestionSheetPartRef {
  slotIds: string[];
}

/** The synthetic part id for a flat list sheet collapsed to a single whole-sheet part. */
export const FLAT_SHEET_PART_ID = "all";

/**
 * Every part of a sheet with its slot ids. Grid layout reports a single `"grid"` part.
 *
 * A list sheet whose top-level questions **all lack sub-parts** isn't meaningfully divided into parts —
 * each question is a single answer slot, so treating each as its own part would just fragment a plain
 * list (noisy per-question "Part 1 / Part 2…" grading, progress, and hide toggles). Such a sheet
 * collapses to one whole-sheet part, and the part breakdowns (which hide below two parts) fall away.
 * Per-question parts are kept only once at least one question has sub-parts to group.
 */
export function questionSheetPartSlots(qs: QuestionSheet): QuestionSheetPartSlots[] {
  if (qs.layout === "grid") {
    return [{
      id: "grid",
      label: "Grid",
      slotIds: questionSheetSlots(qs).map(s => s.id),
    }];
  }
  const firstNumber = qs.firstQuestionNumber ?? 1;
  const perQuestion = qs.questions.map((q, i) => ({
    id: q.id,
    label: q.prompt.trim() || `Question ${firstNumber + i}`,
    slotIds: questionSlotIds(q),
  }));
  const hasSubparts = qs.questions.some(q => (q.parts?.length ?? 0) > 0);
  if (perQuestion.length > 0 && !hasSubparts) {
    return [{
      id: FLAT_SHEET_PART_ID,
      label: "All questions",
      slotIds: perQuestion.flatMap(p => p.slotIds),
    }];
  }
  return perQuestion;
}

/**
 * The top-level questions of a list-layout sheet, as targetable "parts" (id + label). Grid sheets have
 * no parts to single out, so this returns `[]` for them.
 */
export function questionSheetParts(qs: QuestionSheet): QuestionSheetPartRef[] {
  if (qs.layout === "grid") return [];
  return questionSheetPartSlots(qs).map(p => ({
    id: p.id,
    label: p.label,
  }));
}

/** Per-part fill progress for an answer sheet (a "part" = one top-level question). */
export interface AnswerSheetPartProgress {
  questionId: string;
  label: string;
  /** The first answer slot of the part — an anchor to scroll/jump to. */
  firstSlotId: string | null;
  filled: number;
  total: number;
  complete: boolean;
  /** True when this part is hidden for the attempt (excluded from answering & scoring). */
  hidden: boolean;
}

/**
 * Progress through an answer sheet, part by part — how many of each top-level question's slots have a
 * value. Lets the UI show partial completion ("Part 1 done, parts 2–3 to go") without any stored state.
 * A grid sheet is reported as a single part. Each part carries a `hidden` flag from the attempt's
 * `hiddenPartIds`; callers decide whether to skip hidden parts.
 */
export function answerSheetParts(qs: QuestionSheet, as: AnswerSheet): AnswerSheetPartProgress[] {
  const byId = new Map(as.entries.map(e => [e.slotId, e] as const));
  const hidden = new Set(as.hiddenPartIds ?? []);
  return questionSheetPartSlots(qs).map((part) => {
    const filled = part.slotIds.filter(
      id => (byId.get(id)?.value.trim().length ?? 0) > 0,
    ).length;
    return {
      questionId: part.id,
      label: part.label,
      firstSlotId: part.slotIds[0] ?? null,
      filled,
      total: part.slotIds.length,
      complete: part.slotIds.length > 0 && filled === part.slotIds.length,
      hidden: hidden.has(part.id),
    };
  });
}

/** The set of answer-slot ids belonging to the attempt's hidden parts (empty when nothing is hidden). */
export function hiddenSlotIds(qs: QuestionSheet, as: AnswerSheet): Set<string> {
  const hiddenParts = new Set(as.hiddenPartIds ?? []);
  const ids = new Set<string>();
  if (hiddenParts.size === 0) return ids;
  for (const part of questionSheetPartSlots(qs)) {
    if (hiddenParts.has(part.id)) for (const id of part.slotIds) ids.add(id);
  }
  return ids;
}

/** The slots of `qs` still in play for `as` — every slot minus those in hidden parts. */
export function visibleSlots(qs: QuestionSheet, as: AnswerSheet): QuestionSheetSlot[] {
  const hidden = hiddenSlotIds(qs, as);
  const slots = questionSheetSlots(qs);
  return hidden.size === 0 ? slots : slots.filter(s => !hidden.has(s.id));
}

/** A graded score for one part of an answer sheet (a "part" = one top-level question). */
export interface AnswerSheetPartScore {
  questionId: string;
  label: string;
  correct: number;
  graded: number;
  total: number;
  hidden: boolean;
}

/**
 * Tally an answer sheet part by part: each top-level question's `correct` / `graded` / `total` slot
 * counts, plus whether it's hidden. Hidden parts are still returned (flagged) so the edit UI can list
 * them; score displays filter them out. Mirrors {@link answerSheetScore} at the part grain.
 */
export function answerSheetPartScores(qs: QuestionSheet, as: AnswerSheet): AnswerSheetPartScore[] {
  const byId = new Map(as.entries.map(e => [e.slotId, e] as const));
  const hidden = new Set(as.hiddenPartIds ?? []);
  return questionSheetPartSlots(qs).map((part) => {
    let correct = 0;
    let graded = 0;
    for (const id of part.slotIds) {
      const verdict = byId.get(id)?.correct;
      if (verdict === true) {
        correct += 1;
        graded += 1;
      }
      else if (verdict === false) {
        graded += 1;
      }
    }
    return {
      questionId: part.id,
      label: part.label,
      correct,
      graded,
      total: part.slotIds.length,
      hidden: hidden.has(part.id),
    };
  });
}

/**
 * True when every answerable slot of `qs` still in play for `as` has a non-empty answer. Slots in
 * hidden parts don't count (they're not part of this attempt). A sheet with no in-play slots is never
 * "complete" (there is nothing to fill in).
 */
export function isAnswerSheetComplete(qs: QuestionSheet, as: AnswerSheet): boolean {
  const slots = visibleSlots(qs, as);
  if (slots.length === 0) return false;
  const byId = new Map(as.entries.map(e => [e.slotId, e] as const));
  return slots.every(s => (byId.get(s.id)?.value.trim().length ?? 0) > 0);
}

/** A graded score for an answer sheet: how many slots were marked correct, graded, and total. */
export interface AnswerSheetScore {
  /** Slots whose entry verdict is `correct === true`. */
  correct: number;
  /** Slots that have been reviewed (a verdict of true or false was recorded). */
  graded: number;
  /** Total answerable slots on the linked question sheet. */
  total: number;
}

/**
 * Tally an answer sheet against its question sheet: `correct` (verdict true), `graded` (verdict set
 * either way), and `total` slots — over the slots still in play (hidden parts excluded). Callers decide
 * whether to show it — typically only once the sheet {@link isAnswerSheetComplete is complete} and at
 * least one entry has been graded.
 */
export function answerSheetScore(qs: QuestionSheet, as: AnswerSheet): AnswerSheetScore {
  const slots = visibleSlots(qs, as);
  const byId = new Map(as.entries.map(e => [e.slotId, e] as const));
  let correct = 0;
  let graded = 0;
  for (const s of slots) {
    const verdict = byId.get(s.id)?.correct;
    if (verdict === true) {
      correct += 1;
      graded += 1;
    }
    else if (verdict === false) {
      graded += 1;
    }
  }
  return {
    correct,
    graded,
    total: slots.length,
  };
}

/**
 * A question sheet's display title. When the sheet is tied to a specific resource **and** section(s),
 * those identify it best, so we show "<resource> — <section>, <section>" in preference to whatever was
 * typed as the title (which is often a rougher hand-entered name). Falls back to the stored title
 * otherwise. Display-only — the stored `title` is left untouched and still used for search.
 */
export function questionSheetDisplayTitle(
  qs: Pick<QuestionSheet, "title" | "bookmarkTitle" | "sections">,
): string {
  if (qs.bookmarkTitle && qs.sections.length > 0) {
    return `${qs.bookmarkTitle} — ${qs.sections.map(s => s.label).join(", ")}`;
  }
  return qs.title;
}

/**
 * An answer sheet's title with a leading resource-title prefix stripped — for display inside a book
 * group, where the resource title is already the group heading (e.g. "Genki I — L3 vocab — 8/1/2026"
 * shows as "L3 vocab — 8/1/2026"). Removes a case-insensitive leading `resourceTitle` plus a following
 * dash/whitespace separator. Returns the full title when it doesn't start with the prefix, when there's
 * no resource title, or when stripping would leave nothing (the title was just the resource name).
 */
export function answerSheetTitleWithoutResource(
  title: string | null,
  resourceTitle: string | null,
): string {
  const full = title ?? "Answer sheet";
  const prefix = resourceTitle?.trim();
  if (!prefix || !full.toLowerCase().startsWith(prefix.toLowerCase())) return full;
  const rest = full.slice(prefix.length).replace(/^\s*[—–-]\s*/, "").trim();
  return rest.length > 0 ? rest : full;
}

/**
 * The label for an answer sheet inside its book group: the parent question sheet's section names joined
 * with the attempt's associated date — e.g. "L3 vocab — Aug 1, 2026". The book title is already the
 * group heading, so it's left out. Falls back to the sheet's resource-stripped title when it has no
 * sections, and omits the date when the attempt isn't dated.
 */
export function answerSheetSectionDateLabel(
  answerSheet: Pick<AnswerSheet, "title" | "date">,
  questionSheet: Pick<QuestionSheet, "title" | "bookmarkTitle" | "sections"> | undefined,
): string {
  const sections = questionSheet?.sections ?? [];
  const name = sections.length > 0
    ? sections.map(s => s.label).join(", ")
    : answerSheetTitleWithoutResource(
      questionSheet ? questionSheetDisplayTitle(questionSheet) : answerSheet.title,
      questionSheet?.bookmarkTitle ?? null,
    );
  const date = answerSheet.date ? formatDueDate(answerSheet.date) : null;
  return date ? `${name} — ${date}` : name;
}

/**
 * Build a default answer-sheet title from its question sheet, considering which parts are in play. When
 * a strict, non-empty subset of the sheet's parts is included (some are in `hiddenPartIds`), the
 * included parts are named — "Genki 3 — Parts 1, 3 — 8/1/2026"; otherwise it's just the sheet title and
 * date. Grid sheets (no parts) always get the plain form. `now` is injectable for testing.
 */
export function generateAnswerSheetTitle(
  qs: QuestionSheet,
  hiddenPartIds: string[] = [],
  now: Date = new Date(),
): string {
  const base = questionSheetDisplayTitle(qs).trim() || "Answer sheet";
  const date = now.toLocaleDateString();
  const parts = questionSheetParts(qs);
  const hidden = new Set(hiddenPartIds);
  const included = parts
    .map((part, index) => ({
      part,
      number: index + 1,
    }))
    .filter(({
      part,
    }) => !hidden.has(part.id));
  // Only annotate when the attempt covers a strict, non-empty subset of the parts.
  if (parts.length > 1 && included.length > 0 && included.length < parts.length) {
    const numbers = included.map(i => i.number);
    const label = numbers.length === 1 ? `Part ${numbers[0]}` : `Parts ${numbers.join(", ")}`;
    return `${base} — ${label} — ${date}`;
  }
  return `${base} — ${date}`;
}

/** The UTC calendar day of an ISO timestamp, as an epoch-ms at midnight (for day-granular comparisons). */
function utcDay(iso: string): number {
  const d = new Date(iso);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * True when this attempt meets the question sheet's due date: every slot is filled in and the attempt's
 * assigned date falls on or between the day the question sheet was created and its due date (both
 * inclusive). A question sheet with no due date, or an attempt with no assigned date, is never met.
 * Compared at day granularity so an attempt dated the same day the sheet was created still counts.
 */
export function answerSheetMeetsDueDate(qs: QuestionSheet, as: AnswerSheet): boolean {
  if (!qs.dueDate || !as.date) return false;
  if (!isAnswerSheetComplete(qs, as)) return false;
  const answered = utcDay(as.date);
  return answered >= utcDay(qs.createdAt) && answered <= utcDay(qs.dueDate);
}

/** True when any of the given attempts meets the question sheet's due date. */
export function dueDateMet(qs: QuestionSheet, answerSheets: AnswerSheet[]): boolean {
  return answerSheets.some(as => answerSheetMeetsDueDate(qs, as));
}

/** The sentinel filter value meaning "no filter applied" for the resource/learning-area dropdowns. */
export const ALL_FILTER = "all";

/** One `{ value, label }` choice for a filter dropdown. */
export interface FilterOption {
  value: string;
  label: string;
}

/**
 * Distinct resource (Textbook/Worksheet bookmark) filter options across the given question sheets,
 * with an "all" sentinel first. Sheets with no bookmark contribute nothing. Value = `bookmarkId`,
 * label = `bookmarkTitle`.
 */
export function resourceFilterOptions(sheets: QuestionSheet[]): FilterOption[] {
  const seen = new Map<string, string>();
  for (const s of sheets) {
    if (s.bookmarkId && !seen.has(s.bookmarkId)) {
      seen.set(s.bookmarkId, s.bookmarkTitle ?? s.bookmarkId);
    }
  }
  return [
    {
      value: ALL_FILTER,
      label: "All resources",
    },
    ...[...seen].map(([value, label]) => ({
      value,
      label,
    })),
  ];
}

/** One resource's worth of answer sheets: the bookmark id (null = no resource) and its sheets, ordered. */
export interface AnswerSheetResourceGroup {
  bookmarkId: string | null;
  answerSheets: AnswerSheet[];
}

/**
 * Group answer sheets by the resource (`bookmarkId`) of their parent question sheet — the same book
 * organization the question-sheets tab uses — preserving first-seen resource order and pushing the
 * "no resource" bucket (parent has no bookmark, or is missing from `parentById`) to the end. Within a
 * group, sheets order by their parent's position in the book ({@link compareSheetPosition}: TOC rank,
 * then page); attempts of the same question sheet keep their incoming order (createdAt desc).
 */
export function groupAnswerSheetsByResource(
  answerSheets: AnswerSheet[],
  parentById: Map<string, QuestionSheet>,
  tocIndex: Map<string, Map<string, number>>,
): AnswerSheetResourceGroup[] {
  const buckets = new Map<string | null, AnswerSheet[]>();
  for (const as of answerSheets) {
    const key = parentById.get(as.questionSheetId)?.bookmarkId ?? null;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(as);
    else buckets.set(key, [as]);
  }

  const groups: AnswerSheetResourceGroup[] = [];
  let noResource: AnswerSheetResourceGroup | null = null;
  for (const [bookmarkId, bucket] of buckets) {
    // A stable sort keeps same-parent attempts (tied on position) in their incoming order.
    const ordered = [...bucket].sort((a, b) => {
      const pa = parentById.get(a.questionSheetId);
      const pb = parentById.get(b.questionSheetId);
      return pa && pb ? compareSheetPosition(pa, pb, tocIndex) : 0;
    });
    const group = {
      bookmarkId,
      answerSheets: ordered,
    };
    if (bookmarkId === null) noResource = group;
    else groups.push(group);
  }
  if (noResource) groups.push(noResource);
  return groups;
}

/** True when a question sheet passes the resource filter (`ALL_FILTER` passes everything). */
export function matchesResource(qs: QuestionSheet | undefined, resource: string): boolean {
  return resource === ALL_FILTER || (qs?.bookmarkId ?? null) === resource;
}

/** True when a question sheet passes the Learning Area filter (`ALL_FILTER` passes everything). */
export function matchesLearningArea(qs: QuestionSheet | undefined, area: string): boolean {
  return area === ALL_FILTER || (qs?.learningAreas ?? []).includes(area as LearningArea);
}

/** A blank entry for one slot, ready to be filled by the review actions. */
export function emptyAnswerEntry(slotId: string): AnswerSheetEntry {
  return {
    slotId,
    value: "",
    correct: null,
    correction: null,
    reasoning: null,
    intendedMeaning: null,
    actualMeaning: null,
    marks: null,
  };
}

/** True once an entry holds anything worth saving (an answer, a review verdict, or a correction field). */
export function isEntryTouched(e: AnswerSheetEntry): boolean {
  return e.value.trim().length > 0
    || e.correct != null
    || Boolean(e.correction?.trim())
    || Boolean(e.reasoning?.trim())
    || Boolean(e.intendedMeaning?.trim())
    || Boolean(e.actualMeaning?.trim())
    || (e.marks?.length ?? 0) > 0;
}

/** True when an entry carries any correction detail worth showing beyond the raw answer. */
export function hasCorrectionDetail(e: AnswerSheetEntry): boolean {
  return Boolean(e.correction || e.reasoning || e.intendedMeaning || e.actualMeaning);
}

/** True once a slot has been engaged with — an answer, a verdict, or a correction. */
export function isEntryAnswered(e: AnswerSheetEntry): boolean {
  return e.value.trim().length > 0 || e.correct != null || hasCorrectionDetail(e);
}

/** Persist an inline correction built from span marks + typed insertions for one slot. */
export type SaveCorrection = (
  slotId: string,
  result: { correction: string;
    marks: AnswerSheetEntry["marks"];
    reasoning: string | null; },
) => void;

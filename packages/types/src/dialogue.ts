/**
 * Shared Dialogue domain types.
 *
 * A dialogue is a multi-speaker script — from a textbook, a tutor lesson, or the learner's own
 * writing — pasted in the natural `話者：セリフ` form and rendered as a chat transcript. The learner
 * ("私" / "Me") always sits on the right; every other speaker gets their own left-hand column, so a
 * three-speaker scene reads the way it sounds.
 *
 * The parser here is the single implementation shared by both sides: the Fastify API runs it to
 * persist {@link DialogueLine}s (and generate furigana per line), and the React client runs it to
 * preview the script live as it is typed.
 */

import type { FuriToken } from "./index.js";
import type { LearningArea } from "./question-sheet.js";
import type { BookmarkRef } from "./session.js";

import { z } from "zod";

import { furiTokenPartialSchema } from "./furigana.js";
import { isoDateString, objectJsonSchema } from "./json-schema.js";
import { bookmarkRefWriteFields, learningAreaField } from "./session.js";

/** Both the full-width (Japanese) and ASCII colons are accepted as the speaker separator. */
const SPEAKER_SEPARATORS = ["：", ":"];

/**
 * The longest a speaker label may be. Beyond this the text before a colon is far more likely to be
 * prose that happens to contain one than an actual name.
 */
const MAX_SPEAKER_LENGTH = 24;

/** Punctuation that ends a sentence — its presence means the run before the colon isn't a name. */
const SENTENCE_END = /[。．！？.!?]/;

/** Speaker labels that always mean "the learner", regardless of the dialogue. */
const SELF_SPEAKERS = ["私", "me"];

/**
 * One utterance in a dialogue. `speaker` is null for an unattributed line (narration, or a stray line
 * before any speaker has been introduced).
 */
export interface DialogueLine {
  /** Stable id, so a learner-entered {@link translation} survives a re-parse of the script. */
  id: string;
  /** The speaker label exactly as written in the script; null when the line is unattributed. */
  speaker: string | null;
  /** The utterance itself, with the speaker label and separator stripped. */
  text: string;
  /** Auto-generated furigana for {@link text}; null when none was generated. */
  reading: FuriToken[] | null;
  /** Why furigana generation failed, when it did; null otherwise. */
  readingError: string | null;
  /** The learner's English translation of this line; null until they write one. */
  translation: string | null;
  /**
   * A short cue shown *in place of* the line when its speaker is hidden for practice — "greet him and
   * ask how he is", "say you're fine and ask back". Without one a hidden line is a blank wall; with
   * one the learner still knows what this turn is meant to do, which is what makes hiding their own
   * speaker a usable drill rather than a memory test. Null when the line has no hint.
   */
  hint: string | null;
}

/** A line as it comes out of {@link parseDialogueScript} — before furigana or annotations exist. */
export interface ParsedDialogueLine {
  speaker: string | null;
  text: string;
}

/**
 * A dialogue: the raw script plus its parsed lines. The {@link BookmarkRef} half links the dialogue
 * back to the textbook/resource (and section) it came from, denormalized at selection time.
 */
export interface Dialogue extends BookmarkRef {
  id: string;
  /** ISO date (YYYY-MM-DD) the dialogue was written or studied, for grouping activity by day. */
  date: string;
  title: string;
  /** Target language, e.g. "Japanese". */
  language: string;
  /** The raw pasted script — the source of truth for the dialogue's structure. */
  script: string;
  /** The parsed script, carrying per-line furigana, translations, and hints; null when empty. */
  lines: DialogueLine[] | null;
  /**
   * Extra speaker labels to treat as the learner (shown on the right), on top of the built-in
   * "私"/"Me". Lets a script that uses the learner's own name still read as their side of the
   * conversation. Null when none.
   */
  selfSpeakers: string[] | null;
  /**
   * Whether this dialogue earns XP. Off by default: a dialogue copied out of a textbook is *sourced*,
   * not produced, so it shouldn't count. The learner turns it on for dialogues they wrote themselves.
   */
  countsTowardXp: boolean;
  /** Which learning area {@link countsTowardXp} credits; null falls back to Speaking. */
  learningArea: LearningArea | null;
  /** ISO-8601 timestamp of when the dialogue was created. */
  createdAt: string;
  /** ISO-8601 timestamp of the last update. */
  updatedAt: string;
}

/** Payload for creating a dialogue. `title`, `date`, `language`, and `script` are required. */
/**
 * Lines are accepted so the client can send back edited translations and practice hints. Their
 * `speaker`/`text` are re-derived from `script` on write, so what arrives here only ever contributes
 * those annotations.
 */
const lineSchema = z.object({
  id: z.string(),
  speaker: z.string().nullable(),
  text: z.string(),
  reading: z.array(furiTokenPartialSchema).nullable().optional(),
  readingError: z.string().nullable().optional(),
  translation: z.string().nullable().optional(),
  hint: z.string().nullable().optional(),
});

export const createDialogueSchema = z.object({
  title: z.string().min(1),
  language: z.string().min(1),
  /** ISO date (YYYY-MM-DD). */
  date: isoDateString(),
  script: z.string().min(1),
  /** Per-line annotations to keep; speakers and text are always re-derived from `script`. */
  lines: z.array(lineSchema).nullable().optional(),
  ...bookmarkRefWriteFields,
  selfSpeakers: z.array(z.string()).nullable().optional(),
  countsTowardXp: z.boolean().optional(),
  learningArea: learningAreaField(),
});

/** JSON Schema (draft-07) for the create payload, used verbatim as the route body. */
export const createDialogueJsonSchema = objectJsonSchema(createDialogueSchema);

/**
 * Payload for creating a dialogue.
 *
 * `lines` is overridden rather than inferred: the route requires only `id`, `speaker` and `text` on a
 * line, while {@link DialogueLine} declares the annotations present-but-nullable. See
 * {@link bookmarkRefWriteFields} on the bookmark `Omit`.
 */
export type CreateDialogueInput
  = Omit<z.infer<typeof createDialogueSchema>, keyof BookmarkRef | "lines">
    & Partial<BookmarkRef> & {
      lines?: DialogueLine[] | null;
    };

/** Payload for updating a dialogue; every field is optional. */
export interface UpdateDialogueInput extends Partial<BookmarkRef> {
  title?: string;
  date?: string;
  language?: string;
  script?: string;
  lines?: DialogueLine[] | null;
  selfSpeakers?: string[] | null;
  countsTowardXp?: boolean;
  learningArea?: LearningArea | null;
}

/**
 * Decide whether the run before a colon is really a speaker label. Rejecting the doubtful cases is
 * what keeps a bare line like `10:30に行きます` from inventing a speaker called "10".
 */
function isSpeakerLabel(candidate: string): boolean {
  if (candidate.length === 0 || candidate.length > MAX_SPEAKER_LENGTH) return false;
  if (SENTENCE_END.test(candidate)) return false;
  if (/^\d+$/.test(candidate)) return false;
  return true;
}

/** Index of the first `：`/`:` in `line`, or -1 when it has neither. */
function firstSeparatorIndex(line: string): number {
  let found = -1;
  for (const sep of SPEAKER_SEPARATORS) {
    const at = line.indexOf(sep);
    if (at !== -1 && (found === -1 || at < found)) found = at;
  }
  return found;
}

/**
 * Parse a pasted script into speaker-attributed lines.
 *
 * Each line is split on its *first* `：` or `:` (the two are interchangeable), so a timestamp or a URL
 * later in the utterance is left alone. A line whose leading run doesn't look like a name
 * ({@link isSpeakerLabel}) continues the previous utterance instead of starting a new one — which is
 * how a wrapped or multi-sentence line stays attached to its speaker. Blank lines are dropped.
 */
export function parseDialogueScript(script: string): ParsedDialogueLine[] {
  const lines: ParsedDialogueLine[] = [];
  for (const raw of script.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.length === 0) continue;

    const at = firstSeparatorIndex(line);
    const speaker = at === -1 ? "" : line.slice(0, at).trim();
    if (at !== -1 && isSpeakerLabel(speaker)) {
      lines.push({
        speaker,
        text: line.slice(at + 1).trim(),
      });
      continue;
    }

    const previous = lines[lines.length - 1];
    if (previous) previous.text = previous.text.length > 0 ? `${previous.text} ${line}` : line;
    else {
      lines.push({
        speaker: null,
        text: line,
      });
    }
  }
  return lines;
}

/**
 * Whether `speaker` is the learner — matched against the built-in "私"/"Me" (latin case-insensitively)
 * plus any per-dialogue overrides. Self speakers render on the right of the transcript.
 */
export function isSelfSpeaker(speaker: string | null, selfSpeakers?: string[] | null): boolean {
  if (!speaker) return false;
  const label = speaker.trim();
  if (label.length === 0) return false;
  const folded = label.toLowerCase();
  if (SELF_SPEAKERS.includes(folded)) return true;
  return (selfSpeakers ?? []).some(s => s.trim().toLowerCase() === folded);
}

/** The key a line is matched on when its position in the script has shifted. */
function lineKey(speaker: string | null, text: string): string {
  return `${speaker ?? ""} ${text}`;
}

/**
 * Re-parse `script` into stored lines, carrying each surviving line's id, reading, translation, and
 * hint across from `previous`.
 *
 * A line is matched to its old self by position first (the common case — nothing moved), then by
 * speaker+text anywhere in the old list (something was inserted or removed above it). Each old line
 * is consumed at most once, so a repeated utterance doesn't hand the same annotations to every copy.
 * Anything unmatched is genuinely new: it gets a fresh id and a null reading, which is the signal to
 * the API that furigana still needs generating for it.
 *
 * Shared by both sides on purpose — the client runs it to preview an edit and to send annotations
 * back, and the API runs it again authoritatively on write, so the two can never disagree about
 * which line is which.
 */
export function reconcileDialogueLines(
  script: string,
  previous: readonly DialogueLine[],
  makeId: () => string,
): DialogueLine[] {
  const parsed = parseDialogueScript(script);

  const unused = new Map<string, DialogueLine[]>();
  for (const line of previous) {
    const key = lineKey(line.speaker, line.text);
    const bucket = unused.get(key);
    if (bucket) bucket.push(line);
    else unused.set(key, [line]);
  }

  const drop = (line: DialogueLine): boolean => {
    const bucket = unused.get(lineKey(line.speaker, line.text));
    const at = bucket?.indexOf(line) ?? -1;
    if (!bucket || at === -1) return false;
    bucket.splice(at, 1);
    return true;
  };

  // Positional matches get first refusal, so an unchanged script maps 1:1 before any key lookup runs.
  const matched: (DialogueLine | undefined)[] = parsed.map((line, i) => {
    const here = previous[i];
    const same = here && here.speaker === line.speaker && here.text === line.text;
    return same && drop(here) ? here : undefined;
  });

  return parsed.map((line, i) => {
    const carried = matched[i] ?? unused.get(lineKey(line.speaker, line.text))?.shift();
    if (carried) {
      return {
        ...carried,
        speaker: line.speaker,
        text: line.text,
      };
    }
    return {
      id: makeId(),
      speaker: line.speaker,
      text: line.text,
      reading: null,
      readingError: null,
      translation: null,
      hint: null,
    };
  });
}

/** The dialogue's speakers in first-appearance order; unattributed lines contribute nothing. */
export function dialogueSpeakers(
  lines: readonly { speaker: string | null }[] | null | undefined,
): string[] {
  const seen: string[] = [];
  for (const line of lines ?? []) {
    if (line.speaker && !seen.includes(line.speaker)) seen.push(line.speaker);
  }
  return seen;
}

/** How many lines each speaker has, keyed by label. Used for the practice speaker chips. */
export function dialogueLineCounts(
  lines: readonly { speaker: string | null }[] | null | undefined,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const line of lines ?? []) {
    if (line.speaker) counts[line.speaker] = (counts[line.speaker] ?? 0) + 1;
  }
  return counts;
}

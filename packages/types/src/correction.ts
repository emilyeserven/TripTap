/**
 * Shared "Correction Triage" domain types.
 *
 * A correction is a piece of corrected learner output — an (original, corrected) pair the learner
 * wrote and someone/something then fixed. The feature is a pipeline, not a viewer: capture → triage
 * into exactly one bucket → produce a small number of artifacts → export to Anki → force reuse.
 *
 * The load-bearing idea is that **most corrections are thrown away**: triage exists to delete (slips),
 * not to collect. Only rule gaps, collocations, and register mistakes survive. Consumed by both the
 * Fastify API and the React client.
 */

import type { SentenceTermRef } from "./index.js";

import { z } from "zod";

import { objectJsonSchema } from "./json-schema.js";

/* ── Triage decision tree (shipped as data — inspectable + testable) ─────────────────────────────── */

/** The four buckets every correction resolves to. */
export type CorrectionBucket = "slip" | "rule_gap" | "collocation" | "register";

/** The triage tree's question nodes. */
export type TriageNodeId = "q1" | "q2" | "q3" | "q4";

/** A single question in the triage tree, with the options that branch to the next node or a bucket. */
export interface TriageNode {
  id: TriageNodeId;
  question: string;
  options: { label: string;
    next: TriageNodeId | CorrectionBucket; }[];
}

/**
 * The triage decision tree. Three questions maximum; shipped as data so it stays inspectable and
 * testable rather than buried in branching code. Note `q3 → collocation` on "not really": an
 * unnameable rule is functionally a chunk to memorize.
 */
export const TRIAGE_TREE: Record<TriageNodeId, TriageNode> = {
  q1: {
    id: "q1",
    question: "Did you already know the correct form the moment you saw the fix?",
    options: [
      {
        label: "Yes — I knew it, I just fumbled",
        next: "slip",
      },
      {
        label: "No — the fix told me something new",
        next: "q2",
      },
    ],
  },
  q2: {
    id: "q2",
    question: "Was your original sentence actually ungrammatical?",
    options: [
      {
        label: "Yes, it was wrong",
        next: "q3",
      },
      {
        label: "No — grammatical, just not what they'd say",
        next: "q4",
      },
    ],
  },
  q3: {
    id: "q3",
    question: "Can you state the rule you broke in one sentence?",
    options: [
      {
        label: "Yes, I can name it",
        next: "rule_gap",
      },
      {
        label: "Not really",
        next: "collocation",
      },
    ],
  },
  q4: {
    id: "q4",
    question: "Is the problem who you were talking to?",
    options: [
      {
        label: "Yes — wrong politeness level",
        next: "register",
      },
      {
        label: "No — natives just phrase it differently",
        next: "collocation",
      },
    ],
  },
};

/** True when `next` names a terminal bucket rather than another question node. */
export function isCorrectionBucket(next: TriageNodeId | CorrectionBucket): next is CorrectionBucket {
  return next === "slip" || next === "rule_gap" || next === "collocation" || next === "register";
}

/**
 * Resolve a traversed path (the sequence of question nodes answered) plus the final option index into a
 * bucket, or null if the path doesn't reach one. Pure — used by the client flow and unit tests.
 */
export function resolveTriagePath(
  answers: { node: TriageNodeId;
    option: number; }[],
): CorrectionBucket | null {
  let node: TriageNodeId = "q1";
  for (const step of answers) {
    if (step.node !== node) return null;
    const option: TriageNode["options"][number] | undefined
      = TRIAGE_TREE[node].options[step.option];
    if (!option) return null;
    if (isCorrectionBucket(option.next)) return option.next;
    node = option.next;
  }
  return null;
}

/* ── Correction entity ───────────────────────────────────────────────────────────────────────────── */

/** Where a correction came from. */
export type CorrectionSource = "tutor" | "native_speaker" | "app" | "self";

/** The correction sources, for iterating in schemas/pickers. */
export const CORRECTION_SOURCES: readonly CorrectionSource[] = [
  "tutor",
  "native_speaker",
  "app",
  "self",
];

/**
 * The default recurrence gate (spec §6 inv.1): a rule group can't be created until a rule tag has
 * been seen this many times. Centralized so making it user-configurable later is a one-line change.
 */
export const DEFAULT_RECURRENCE_GATE = 2;

/** The maximum number of new cards that may be produced per capture batch (spec §6 inv.2). */
export const BATCH_CARD_CAP = 3;

/** The kind of existing entity a correction was imported from (spec §M2). */
export type CorrectionImportKind
  = | "my_sentence"
    | "writing"
    | "answer_sheet"
    | "reading_session"
    | "practice_sentence";

/** The importable sources, for iterating in schemas and the import dialog's tabs. */
export const CORRECTION_IMPORT_KINDS: readonly CorrectionImportKind[] = [
  "my_sentence",
  "writing",
  "answer_sheet",
  "reading_session",
  "practice_sentence",
];

/** Provenance for a correction pulled from an existing embedded-correction entity. */
export interface CorrectionImportRef {
  kind: CorrectionImportKind;
  /** The source entity's id (or `${entityId}:${slotId}` for a single answer-sheet slot). */
  id: string;
}

/** The triage verdict recorded on a correction once the learner works through the tree. */
export interface Triage {
  bucket: CorrectionBucket;
  /** The question nodes answered, in order — makes bad triage debuggable and re-triage cheap. */
  path: TriageNodeId[];
  /** REQUIRED when `bucket === "rule_gap"`: the rule tag this error is grouped under. */
  ruleTagKey?: string | null;
  /** REQUIRED when `bucket === "register"`: the scene/audience that was wrong. */
  scene?: string | null;
  /** ISO-8601 timestamp of when triage happened. */
  triagedAt: string;
  /** Ids of chunk cards / rule groups this correction produced; empty for slips (always). */
  producedCardIds: string[];
}

/** A captured, possibly-triaged correction. */
export interface Correction {
  id: string;
  /** What the learner wrote (or, for a no-fix sentence, just the sentence). */
  original: string;
  /** The fix; null for a non-correction sentence added without one. */
  corrected: string | null;
  /** Prompt or surrounding sentence, for context; null when none. */
  context: string | null;
  /** The corrector's note / explanation, when given. */
  correctorNote: string | null;
  source: CorrectionSource;
  /** The tutoring lesson this came out of, if any (nullable FK). */
  lessonId: string | null;
  /** Set when this row was imported from an existing embedded correction; null for paste-in. */
  importedFrom: CorrectionImportRef | null;
  /** One capture session; groups the Inbox and drives the volume cap. */
  batchId: string;
  /** The triage verdict; null while the correction still sits in the Inbox. */
  triage: Triage | null;
  /** ISO-8601 timestamp of when the correction was captured. */
  createdAt: string;
}

/** The four buckets, as a literal tuple the schemas below enumerate. */
const BUCKETS = ["slip", "rule_gap", "collocation", "register"] as const;

/** The triage tree's question nodes, as a literal tuple the schemas below enumerate. */
const NODE_IDS = ["q1", "q2", "q3", "q4"] as const;

/**
 * The verdict itself — the four fields a learner's answers produce. Shared by the *stored* shape
 * ({@link triageRefSchema}, which stamps when it happened and what it produced) and the *submitted*
 * shape ({@link triageCorrectionSchema}, which carries the rule tag's display fields).
 */
const triageVerdictSchema = z.object({
  bucket: z.enum(BUCKETS),
  path: z.array(z.enum(NODE_IDS)),
  ruleTagKey: z.string().nullable().optional(),
  scene: z.string().nullable().optional(),
});

/** A persisted triage verdict, as embedded on a correction row. */
const triageRefSchema = triageVerdictSchema.extend({
  triagedAt: z.string(),
  producedCardIds: z.array(z.string()),
}).nullable();

const importRefSchema = z.object({
  kind: z.enum(CORRECTION_IMPORT_KINDS),
  id: z.string(),
});

/** Payload for creating a correction. Only `original` is required; omit `corrected` for a no-fix sentence. */
export const createCorrectionSchema = z.object({
  original: z.string().min(1),
  /** Null / omitted for a non-correction sentence added without a fix. */
  corrected: z.string().nullable().optional(),
  context: z.string().nullable().optional(),
  correctorNote: z.string().nullable().optional(),
  /** Defaults to `"self"` server-side when omitted. */
  source: z.enum(CORRECTION_SOURCES).optional(),
  lessonId: z.string().nullable().optional(),
  importedFrom: importRefSchema.nullable().optional(),
  /** One capture session; a fresh batch id is minted server-side when omitted. */
  batchId: z.guid().nullable().optional(),
  triage: triageRefSchema.optional(),
});

/** JSON Schema (draft-07) for the create payload, used verbatim as the route body. */
export const createCorrectionJsonSchema = objectJsonSchema(createCorrectionSchema);

/**
 * `triage` is overridden rather than inferred: the route requires only `bucket`, `path`, `triagedAt`
 * and `producedCardIds`, while {@link Triage} declares `ruleTagKey`/`scene` as present-but-nullable.
 * Inferring would loosen the stored type for every reader.
 */
export type CreateCorrectionInput = Omit<z.infer<typeof createCorrectionSchema>, "triage"> & {
  triage?: Triage | null;
};

/** Payload for partially updating a correction (editing the text/note or re-triaging). */
export type UpdateCorrectionInput = Partial<CreateCorrectionInput>;

/**
 * An importable (original, corrected) pair drawn from an existing embedded-correction entity (a My
 * Sentence, a writing's inline correction, or an answer-sheet slot) that hasn't been imported yet.
 */
export interface CorrectionImportCandidate {
  ref: CorrectionImportRef;
  original: string;
  /** The fix; null for a source sentence that has no correction. */
  corrected: string | null;
  correctorNote: string | null;
  context: string | null;
  /** Where it came from, for display (e.g. a writing's date or an answer sheet's title). */
  label: string | null;
  /** Grammar-source tags on the source entity, for display in the picker; empty when none. */
  grammarTerms: SentenceTermRef[];
}

/** Payload for `POST /api/corrections/import`: the refs to pull in, and the batch to file them under. */
export const importCorrectionsSchema = z.object({
  refs: z.array(importRefSchema),
  /** One capture session for the whole import; a fresh batch id is minted server-side when omitted. */
  batchId: z.guid().nullable().optional(),
});

/** JSON Schema (draft-07) for the import payload, used verbatim as the route body. */
export const importCorrectionsJsonSchema = objectJsonSchema(importCorrectionsSchema);

/** Payload for `POST /api/corrections/import`. */
export type ImportCorrectionsInput = z.infer<typeof importCorrectionsSchema>;

/**
 * Payload for submitting a triage verdict via `POST /api/corrections/:id/triage`.
 *
 * The last three fields are why this file declares its schemas: they were on the type and read by
 * the service (`upsertRuleTag`), but the hand-written route body never listed them, so Ajv's
 * `removeAdditional` stripped all three off every request. A rule tag created by triage therefore
 * came out unlabelled and unlinked no matter what the client sent. Deriving the body from the type
 * is what makes that unrepresentable.
 */
export const triageCorrectionSchema = triageVerdictSchema.extend({
  /**
   * For a `rule_gap`, the rule tag's display + optional grammar link. The server upserts a
   * {@link RuleTag} from these so the tag exists (with a label and any grammar join) after triage.
   */
  ruleTagLabel: z.string().nullable().optional(),
  grammarTagId: z.string().nullable().optional(),
  grammarTagName: z.string().nullable().optional(),
});

/** JSON Schema (draft-07) for the triage payload, used verbatim as the route body. */
export const triageCorrectionJsonSchema = objectJsonSchema(triageCorrectionSchema);

/** Payload for submitting a triage verdict. */
export type TriageCorrectionInput = z.infer<typeof triageCorrectionSchema>;

/* ── Derived error log (computed on read; never persisted — counts would drift) ──────────────────── */

/** One correction as it appears in the log. */
export interface CorrectionLogEntry {
  correctionId: string;
  original: string;
  corrected: string | null;
  /** The capture batch — needed to file a chunk card produced from this correction under its cap. */
  batchId: string;
  createdAt: string;
}

/** A rule-tag group in the log: the errors that carry one tag, with an occurrence count. */
export interface CorrectionRuleGapGroup {
  ruleTagKey: string;
  /** The rule tag's display label, or null when the tag hasn't been named yet. */
  ruleTagLabel: string | null;
  /** The linked Grammar Source tag id, when the rule tag joins to studied grammar. */
  grammarTagId: string | null;
  grammarTagName: string | null;
  occurrenceCount: number;
  /** ISO-8601 timestamp of the most recent correction carrying this tag. */
  lastSeenAt: string;
  /** True once `occurrenceCount >= gate` — the tag has earned a rule group. */
  meetsGate: boolean;
  corrections: CorrectionLogEntry[];
}

/**
 * The error log — a derived view over triaged corrections. Rule gaps are grouped by rule tag and
 * sorted by frequency; collocations and register mistakes are flat lists (no rule to group on).
 */
export interface CorrectionLog {
  /** The recurrence gate in effect (spec §6 inv.1). */
  gate: number;
  ruleGaps: CorrectionRuleGapGroup[];
  collocations: CorrectionLogEntry[];
  registers: CorrectionLogEntry[];
}

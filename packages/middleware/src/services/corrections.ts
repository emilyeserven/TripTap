import { and, desc, eq, isNull, isNotNull } from "drizzle-orm";
import type {
  Correction,
  CorrectionLog,
  CorrectionLogEntry,
  CorrectionRuleGapGroup,
  CreateCorrectionInput,
  GrammarFailureStats,
  TriageCorrectionInput,
  UpdateCorrectionInput,
} from "@sentence-bank/types";
import { DEFAULT_RECURRENCE_GATE } from "@sentence-bank/types";
import { db } from "@/db";
import { corrections, type CorrectionRow, ruleTags } from "@/db/schema";
import { crudService } from "@/services/crud";
import { upsertRuleTag } from "@/services/rule-tags";
import { toIso } from "@/services/rows";

/**
 * Thrown when a triage verdict is missing a field its bucket requires (a rule tag for `rule_gap`, a
 * scene for `register`). The route maps this to a 400 (spec §6, §11 acceptance criteria).
 */
export class TriageValidationError extends Error {}

/** Map a DB row to the shared `Correction` wire type. */
function toCorrection(row: CorrectionRow): Correction {
  return {
    id: row.id,
    original: row.original,
    corrected: row.corrected,
    context: row.context,
    correctorNote: row.correctorNote,
    source: row.source,
    lessonId: row.lessonId,
    importedFrom: row.importedFrom ?? null,
    batchId: row.batchId,
    triage: row.triage ?? null,
    createdAt: toIso(row.createdAt),
  };
}

/** Drizzle insert shape for one correction row, from the create input. */
function toInsert(input: CreateCorrectionInput) {
  return {
    original: input.original,
    corrected: input.corrected ?? null,
    context: input.context ?? null,
    correctorNote: input.correctorNote ?? null,
    source: input.source ?? "self",
    lessonId: input.lessonId ?? null,
    importedFrom: input.importedFrom ?? null,
    // A lone create still gets its own batch; the column defaults to a fresh uuid when omitted.
    ...(input.batchId
      ? {
        batchId: input.batchId,
      }
      : {}),
    triage: input.triage ?? null,
  };
}

// No `updated_at` column; a correction's lifecycle is tracked by `triage` instead.
const crud = crudService(corrections, {
  toWire: toCorrection,
  toInsert,
  orderBy: [desc(corrections.createdAt)],
  touchUpdatedAt: false,
});

/** List corrections, newest first. `untriaged` limits to the Inbox; `batchId` scopes to one batch. */
export function listCorrections(
  opts: { untriaged?: boolean;
    batchId?: string; } = {},
): Promise<Correction[]> {
  const filters = [];
  if (opts.untriaged) filters.push(isNull(corrections.triage));
  if (opts.batchId) filters.push(eq(corrections.batchId, opts.batchId));
  return crud.list(filters.length ? and(...filters) : undefined);
}

export const getCorrection = crud.get;
export const createCorrection = crud.create;
export const deleteCorrection = crud.remove;

/** Hand-written: `batchId` is not-null, so a partial edit must not be allowed to blank it. */
export async function updateCorrection(
  id: string,
  input: UpdateCorrectionInput,
): Promise<Correction | null> {
  // `batchId` is not-null; drop a null/omitted value so a partial edit can't blank it out.
  const {
    batchId, ...rest
  } = input;
  const set = batchId != null
    ? {
      ...rest,
      batchId,
    }
    : rest;
  const [row] = await db
    .update(corrections)
    .set(set)
    .where(eq(corrections.id, id))
    .returning();
  return row ? toCorrection(row) : null;
}

/**
 * How many kept rule-gap corrections carry a given rule tag — the count the recurrence gate checks
 * (spec §6 inv.1). Computed on read, never persisted.
 */
export async function ruleTagOccurrenceCount(ruleTagKey: string): Promise<number> {
  const rows = await db
    .select({
      triage: corrections.triage,
    })
    .from(corrections)
    .where(isNotNull(corrections.triage));
  return rows.filter(r => r.triage?.bucket === "rule_gap" && r.triage.ruleTagKey === ruleTagKey)
    .length;
}

/**
 * Record that a card/group was produced from the given corrections, appending its id to each one's
 * `triage.producedCardIds` (deduped). Best-effort — a correction that was deleted or never triaged is
 * skipped.
 */
export async function linkProducedCards(
  correctionIds: string[],
  cardId: string,
): Promise<void> {
  for (const id of correctionIds) {
    const [row] = await db
      .select({
        triage: corrections.triage,
      })
      .from(corrections)
      .where(eq(corrections.id, id));
    if (!row?.triage) continue;
    if (row.triage.producedCardIds.includes(cardId)) continue;
    const triage = {
      ...row.triage,
      producedCardIds: [...row.triage.producedCardIds, cardId],
    };
    await db.update(corrections).set({
      triage,
    }).where(eq(corrections.id, id));
  }
}

/**
 * Apply a triage verdict. A `slip` **deletes** the correction (it produces zero cards and shouldn't
 * accumulate); every other bucket persists the verdict. Returns `{ deleted: true }` for a slip, the
 * updated correction otherwise, or `null` when the correction doesn't exist.
 */
export async function triageCorrection(
  id: string,
  input: TriageCorrectionInput,
): Promise<{ deleted: true } | Correction | null> {
  if (input.bucket === "rule_gap" && !input.ruleTagKey?.trim()) {
    throw new TriageValidationError("A rule gap must be tagged with a rule tag.");
  }
  if (input.bucket === "register" && !input.scene?.trim()) {
    throw new TriageValidationError("A register mistake must record the scene.");
  }

  if (input.bucket === "slip") {
    const deleted = await deleteCorrection(id);
    return deleted
      ? {
        deleted: true,
      }
      : null;
  }

  const ruleTagKey = input.bucket === "rule_gap" ? input.ruleTagKey!.trim() : null;
  // Make sure the rule tag exists (with its label and any grammar link) so the log and grammar
  // badges can resolve it — a first sighting inserts it, a repeat refreshes the label/link.
  if (ruleTagKey) {
    await upsertRuleTag({
      key: ruleTagKey,
      label: input.ruleTagLabel ?? undefined,
      grammarTagId: input.grammarTagId ?? undefined,
      grammarTagName: input.grammarTagName ?? undefined,
    });
  }

  const triage = {
    bucket: input.bucket,
    path: input.path,
    ruleTagKey,
    scene: input.bucket === "register" ? input.scene!.trim() : null,
    triagedAt: new Date().toISOString(),
    producedCardIds: [] as string[],
  };
  const [row] = await db
    .update(corrections)
    .set({
      triage,
    })
    .where(eq(corrections.id, id))
    .returning();
  return row ? toCorrection(row) : null;
}

function toLogEntry(row: CorrectionRow): CorrectionLogEntry {
  return {
    correctionId: row.id,
    original: row.original,
    corrected: row.corrected,
    batchId: row.batchId,
    createdAt: toIso(row.createdAt),
  };
}

/**
 * The error log: triaged, non-slip corrections. Rule gaps are grouped by rule tag and sorted by
 * frequency (so the tag that hit the recurrence gate surfaces first); collocations and register
 * mistakes are flat lists. Counts are computed here, never persisted, so they can't drift.
 */
export async function getCorrectionLog(gate = DEFAULT_RECURRENCE_GATE): Promise<CorrectionLog> {
  const [rows, tags] = await Promise.all([
    db
      .select()
      .from(corrections)
      .where(isNotNull(corrections.triage))
      .orderBy(desc(corrections.createdAt)),
    db.select().from(ruleTags),
  ]);
  const tagByKey = new Map(tags.map(t => [t.key, t]));

  const groups = new Map<string, CorrectionRuleGapGroup>();
  const collocations: CorrectionLogEntry[] = [];
  const registers: CorrectionLogEntry[] = [];

  for (const row of rows) {
    const triage = row.triage;
    if (!triage || triage.bucket === "slip") continue;
    const entry = toLogEntry(row);
    if (triage.bucket === "collocation") {
      collocations.push(entry);
      continue;
    }
    if (triage.bucket === "register") {
      registers.push(entry);
      continue;
    }
    // rule_gap
    const key = triage.ruleTagKey?.trim();
    if (!key) continue;
    let group = groups.get(key);
    if (!group) {
      const tag = tagByKey.get(key);
      group = {
        ruleTagKey: key,
        ruleTagLabel: tag?.label ?? null,
        grammarTagId: tag?.grammarTagId ?? null,
        grammarTagName: tag?.grammarTagName ?? null,
        occurrenceCount: 0,
        lastSeenAt: entry.createdAt,
        meetsGate: false,
        corrections: [],
      };
      groups.set(key, group);
    }
    group.corrections.push(entry);
    group.occurrenceCount += 1;
    // rows are newest-first, so the first entry seen is the most recent.
    if (entry.createdAt > group.lastSeenAt) group.lastSeenAt = entry.createdAt;
  }

  const ruleGaps = [...groups.values()]
    .map(g => ({
      ...g,
      meetsGate: g.occurrenceCount >= gate,
    }))
    .sort((a, b) =>
      b.occurrenceCount - a.occurrenceCount || b.lastSeenAt.localeCompare(a.lastSeenAt));

  return {
    gate,
    ruleGaps,
    collocations,
    registers,
  };
}

/**
 * Failure history for one Grammar Source tag: how many kept rule-gap corrections carry a rule tag
 * linked to it, and when the most recent was. Powers the "you've broken this N times" badge on a
 * grammar note (spec §5, §11). Returns a zero count when nothing links to the tag.
 */
export async function grammarFailureStats(grammarTagId: string): Promise<GrammarFailureStats> {
  // Rule-tag keys linked to this grammar tag.
  const linkedTags = await db
    .select({
      key: ruleTags.key,
    })
    .from(ruleTags)
    .where(eq(ruleTags.grammarTagId, grammarTagId));
  const keys = new Set(linkedTags.map(t => t.key));
  if (keys.size === 0) {
    return {
      grammarTagId,
      count: 0,
      lastSeenAt: null,
    };
  }

  const rows = await db
    .select({
      triage: corrections.triage,
      createdAt: corrections.createdAt,
    })
    .from(corrections)
    .where(isNotNull(corrections.triage))
    .orderBy(desc(corrections.createdAt));

  let count = 0;
  let lastSeenAt: string | null = null;
  for (const row of rows) {
    const triage = row.triage;
    if (!triage || triage.bucket !== "rule_gap") continue;
    if (!triage.ruleTagKey || !keys.has(triage.ruleTagKey)) continue;
    count += 1;
    const iso = toIso(row.createdAt);
    if (!lastSeenAt || iso > lastSeenAt) lastSeenAt = iso;
  }

  return {
    grammarTagId,
    count,
    lastSeenAt,
  };
}

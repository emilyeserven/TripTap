import { desc, eq } from "drizzle-orm";
import type {
  CreateRuleGroupInput,
  RuleGroup,
  UpdateRuleGroupInput,
} from "@sentence-bank/types";
import {
  DEFAULT_RECURRENCE_GATE,
  MAX_GROUP_PAIRS,
  MIN_GROUP_PAIRS,
} from "@sentence-bank/types";
import { db } from "@/db";
import { ruleGroups, type RuleGroupRow } from "@/db/schema";
import { linkProducedCards, ruleTagOccurrenceCount } from "@/services/corrections";
import { toIsoOrNull } from "@/services/rows";

/** A group can't be built before its rule tag has recurred enough (spec §6 inv.1). */
export class RecurrenceGateError extends Error {}
/** One group per rule tag; a reappearing tag reactivates the existing group (spec §6 inv.7). */
export class DuplicateGroupError extends Error {}
/** A group must hold 4–6 contrast pairs (spec §6 inv.9). */
export class GroupSizeError extends Error {}

function toRuleGroup(row: RuleGroupRow): RuleGroup {
  return {
    id: row.id,
    ruleTagKey: row.ruleTagKey,
    axis: row.axis,
    status: row.status,
    items: row.items,
    seedCorrectionIds: row.seedCorrectionIds ?? [],
    createdAt: toIsoOrNull(row.createdAt)!,
    exportedAt: toIsoOrNull(row.exportedAt),
    suspendedAt: toIsoOrNull(row.suspendedAt),
  };
}

/** Reject a group whose pair count is outside 4–6 (spec §6 inv.9). */
function assertGroupSize(count: number): void {
  if (count < MIN_GROUP_PAIRS || count > MAX_GROUP_PAIRS) {
    throw new GroupSizeError(
      `A rule group must have ${MIN_GROUP_PAIRS}–${MAX_GROUP_PAIRS} contrast pairs (got ${count}).`,
    );
  }
}

export async function listRuleGroups(): Promise<RuleGroup[]> {
  const rows = await db.select().from(ruleGroups).orderBy(desc(ruleGroups.createdAt));
  return rows.map(toRuleGroup);
}

export async function getRuleGroup(id: string): Promise<RuleGroup | null> {
  const [row] = await db.select().from(ruleGroups).where(eq(ruleGroups.id, id));
  return row ? toRuleGroup(row) : null;
}

export async function getRuleGroupByTag(ruleTagKey: string): Promise<RuleGroup | null> {
  const [row] = await db.select().from(ruleGroups).where(eq(ruleGroups.ruleTagKey, ruleTagKey));
  return row ? toRuleGroup(row) : null;
}

/**
 * Create a rule group, enforcing the recurrence gate (inv.1), the 4–6 size (inv.9), and one-group-
 * per-tag (inv.7). Records the new group on its seed corrections' `producedCardIds`.
 */
export async function createRuleGroup(
  input: CreateRuleGroupInput,
  gate = DEFAULT_RECURRENCE_GATE,
): Promise<RuleGroup> {
  assertGroupSize(input.items.length);

  const occurrences = await ruleTagOccurrenceCount(input.ruleTagKey);
  if (occurrences < gate) {
    throw new RecurrenceGateError(
      `"${input.ruleTagKey}" has ${occurrences} strike(s); it needs ${gate} before it earns a group.`,
    );
  }

  const existing = await getRuleGroupByTag(input.ruleTagKey);
  if (existing) {
    throw new DuplicateGroupError(`"${input.ruleTagKey}" already has a rule group.`);
  }

  const seedCorrectionIds = input.seedCorrectionIds ?? [];
  const [row] = await db
    .insert(ruleGroups)
    .values({
      ruleTagKey: input.ruleTagKey,
      axis: input.axis,
      status: input.status ?? "proposed",
      items: input.items,
      seedCorrectionIds,
    })
    .returning();
  if (seedCorrectionIds.length > 0) await linkProducedCards(seedCorrectionIds, row.id);
  return toRuleGroup(row);
}

/**
 * Update a rule group. Enforces the 4–6 size when items change, and keeps `suspendedAt` in sync with
 * the status (set on `suspended`, cleared otherwise) so unsuspending is just a status flip.
 */
export async function updateRuleGroup(
  id: string,
  input: UpdateRuleGroupInput,
): Promise<RuleGroup | null> {
  if (input.items) assertGroupSize(input.items.length);

  const set: Partial<RuleGroupRow> = {};
  if (input.axis !== undefined) set.axis = input.axis;
  if (input.items !== undefined) set.items = input.items;
  if (input.seedCorrectionIds !== undefined) set.seedCorrectionIds = input.seedCorrectionIds;
  if (input.status !== undefined) {
    set.status = input.status;
    // Keep the suspension timestamp consistent with the status unless the caller set it explicitly.
    if (input.suspendedAt === undefined) {
      set.suspendedAt = input.status === "suspended" ? new Date() : null;
    }
  }
  if (input.suspendedAt !== undefined) set.suspendedAt = input.suspendedAt ? new Date(input.suspendedAt) : null;
  if (input.exportedAt !== undefined) set.exportedAt = input.exportedAt ? new Date(input.exportedAt) : null;

  const [row] = await db.update(ruleGroups).set(set).where(eq(ruleGroups.id, id)).returning();
  return row ? toRuleGroup(row) : null;
}

export async function deleteRuleGroup(id: string): Promise<boolean> {
  const rows = await db
    .delete(ruleGroups)
    .where(eq(ruleGroups.id, id))
    .returning({
      id: ruleGroups.id,
    });
  return rows.length > 0;
}

import { asc, eq } from "drizzle-orm";
import type { RuleTag, UpsertRuleTagInput } from "@sentence-bank/types";
import { db } from "@/db";
import { ruleTags, type RuleTagRow } from "@/db/schema";
import { toIso } from "@/services/rows";

/** Map a DB row to the shared `RuleTag` wire type. */
function toRuleTag(row: RuleTagRow): RuleTag {
  return {
    key: row.key,
    label: row.label,
    grammarTagId: row.grammarTagId,
    grammarTagName: row.grammarTagName,
    createdAt: toIso(row.createdAt),
  };
}

export async function listRuleTags(): Promise<RuleTag[]> {
  const rows = await db.select().from(ruleTags).orderBy(asc(ruleTags.label));
  return rows.map(toRuleTag);
}

export async function getRuleTag(key: string): Promise<RuleTag | null> {
  const [row] = await db.select().from(ruleTags).where(eq(ruleTags.key, key));
  return row ? toRuleTag(row) : null;
}

/**
 * Create or update a rule tag by key. A first sighting inserts it (label defaulting to the key); a
 * repeat updates the label and grammar link only when the caller supplies them, so re-triaging an
 * existing tag without re-specifying its grammar link never clears it.
 */
export async function upsertRuleTag(input: UpsertRuleTagInput): Promise<RuleTag> {
  const label = input.label?.trim() || input.key;
  const set: Partial<{ label: string;
    grammarTagId: string | null;
    grammarTagName: string | null; }>
    = {
      label,
    };
  if (input.grammarTagId !== undefined) set.grammarTagId = input.grammarTagId ?? null;
  if (input.grammarTagName !== undefined) set.grammarTagName = input.grammarTagName ?? null;

  const [row] = await db
    .insert(ruleTags)
    .values({
      key: input.key,
      label,
      grammarTagId: input.grammarTagId ?? null,
      grammarTagName: input.grammarTagName ?? null,
    })
    .onConflictDoUpdate({
      target: ruleTags.key,
      set,
    })
    .returning();
  return toRuleTag(row);
}

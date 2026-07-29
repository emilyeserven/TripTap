/**
 * Shared "Rule Tag" domain types.
 *
 * A rule tag is a global, named grammar-error category that recurring rule-gap corrections group
 * under (e.g. `transitivity`, `ni-vs-de-location`). It is the app's own taxonomy — not every error
 * maps to a studied grammar point — but a tag may optionally link to a Grammar Source tag
 * (`grammarTagId` → `GrammarNote.tagId`), which is what lets a grammar note show its failure history.
 * Consumed by both the Fastify API and the React client.
 */

/** A global rule-error category. `key` is a stable slug and the join used across corrections. */
export interface RuleTag {
  /** Stable slug, e.g. "transitivity". The key rule-gap corrections reference. */
  key: string;
  /** Human label, e.g. "Transitive / intransitive pairs". */
  label: string;
  /** Linked Grammar Source tag id (→ `GrammarNote.tagId`), when the rule maps to studied grammar. */
  grammarTagId: string | null;
  /** Denormalized grammar tag display name, mirroring the `GrammarNote.tagId` + `tagName` pattern. */
  grammarTagName: string | null;
  createdAt: string;
}

/** Payload for creating/updating a rule tag. `key` identifies it; the rest is upserted. */
export interface UpsertRuleTagInput {
  key: string;
  label?: string;
  grammarTagId?: string | null;
  grammarTagName?: string | null;
}

/** Failure history for one grammar tag: how many kept rule-gap corrections link to it, and when last. */
export interface GrammarFailureStats {
  grammarTagId: string;
  count: number;
  /** ISO-8601 timestamp of the most recent linked correction, or null when none. */
  lastSeenAt: string | null;
}

/**
 * Derive a rule-tag key (slug) from a free-text label: lowercase, spaces/underscores → hyphens, drop
 * anything but letters/numbers (any script — so Japanese labels keep their characters) and hyphens,
 * collapse repeats. Falls back to the trimmed label when the slug would be empty (a label with no
 * letters or numbers at all), so the key is never blank.
 */
export function ruleTagKeyFromLabel(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || label.trim();
}

/**
 * Shared "Rule Group" domain types.
 *
 * A rule group is a small set (4–6) of minimal-contrast pairs that teach one grammar boundary — the
 * artifact a recurring {@link RuleTag} earns once it hits the recurrence gate. Each {@link ContrastPair}
 * varies a *single* axis (e.g. transitive vs intransitive) and shows both options on the front, so the
 * learner discriminates rather than pattern-matches. One pair maps to one Anki note (two sibling
 * cards); Anki owns the actual review/scheduling. Consumed by both the Fastify API and the React client.
 */

import { z } from "zod";

import { objectJsonSchema } from "./json-schema.js";

/** Minimum / maximum pairs in a group (spec §6 inv.9) — fewer teaches no boundary, more blows the budget. */
export const MIN_GROUP_PAIRS = 4;
export const MAX_GROUP_PAIRS = 6;

/** Days of no activity on a rule tag after which an active group is proposed for suspension (spec §6 inv.7). */
export const RULE_SUSPENSION_DAYS = 42;

/** One side of a contrast pair: the Japanese and its English gloss. */
export interface ContrastPairSide {
  jp: string;
  en: string;
}

/** One minimal-contrast pair = one Anki note (→ two sibling cards). Varies exactly one axis. */
export interface ContrastPair {
  id: string;
  a: ContrastPairSide;
  b: ContrastPairSide;
  /** The two choices shown on the front (e.g. ["消す", "消える"]) — the discrimination point. */
  options: [string, string];
}

/**
 * Authoring lifecycle (not a review scheduler — Anki owns review): `proposed` (drafted, not yet
 * exported), `active` (exported to Anki), `suspended` (retired after inactivity; reappearance
 * reactivates the same group rather than creating a duplicate).
 */
export type RuleGroupStatus = "proposed" | "active" | "suspended";

/** The rule-group statuses, for iterating in schemas/pickers. */
export const RULE_GROUP_STATUSES: readonly RuleGroupStatus[] = ["proposed", "active", "suspended"];

/** A set of contrast pairs teaching one rule boundary; one per rule tag. */
export interface RuleGroup {
  id: string;
  /** The rule tag this group teaches; unique — one group per tag (spec §6 inv.7). */
  ruleTagKey: string;
  /** The single axis the pairs vary, e.g. "transitive vs intransitive" (spec §6 inv.10). */
  axis: string;
  status: RuleGroupStatus;
  items: ContrastPair[];
  /** The corrections that earned this group. */
  seedCorrectionIds: string[];
  createdAt: string;
  /** ISO-8601 timestamp of the last Anki export, or null if never exported. */
  exportedAt: string | null;
  /** ISO-8601 timestamp of suspension, or null while not suspended. */
  suspendedAt: string | null;
}

/** Payload for creating a rule group. `ruleTagKey`, `axis`, and 4–6 `items` are required. */
const contrastSideSchema = z.object({
  jp: z.string(),
  en: z.string(),
});

export const createRuleGroupSchema = z.object({
  ruleTagKey: z.string().min(1),
  // A single named axis (spec §6 inv.10) — structurally forced alongside a/b/options below.
  axis: z.string().min(1),
  items: z.array(z.object({
    id: z.string(),
    a: contrastSideSchema,
    b: contrastSideSchema,
    // Both options on the front — the discrimination point (spec §6 inv.4).
    options: z.array(z.string()).min(2).max(2),
  })).min(MIN_GROUP_PAIRS).max(MAX_GROUP_PAIRS),
  seedCorrectionIds: z.array(z.string()).optional(),
  status: z.enum(["proposed", "active", "suspended"]).optional(),
});

/** JSON Schema (draft-07) for the create payload, used verbatim as the route body. */
export const createRuleGroupJsonSchema = objectJsonSchema(createRuleGroupSchema);

/**
 * `options` is overridden rather than inferred: the wire schema spells the pair as an array with
 * `minItems`/`maxItems` (what the route has always validated), and Zod infers that as `string[]`.
 * `z.tuple` would infer the tuple correctly but emit a different JSON Schema shape — draft-7's
 * `items: [a, b]` form — changing the published contract. The type keeps the precision; the
 * validator keeps the shape.
 */
export type CreateRuleGroupInput = Omit<z.infer<typeof createRuleGroupSchema>, "items"> & {
  items: ContrastPair[];
};

/** Payload for partially updating a rule group. The rule tag (its identity) is immutable. */
export type UpdateRuleGroupInput = Partial<Omit<CreateRuleGroupInput, "ruleTagKey">> & {
  exportedAt?: string | null;
  suspendedAt?: string | null;
};

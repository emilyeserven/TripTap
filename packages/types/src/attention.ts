/**
 * The "needs your attention" inbox's wire types: the kinds of item it groups, and the learner's
 * hide list.
 *
 * The inbox itself is derived client-side from lists the app already fetches (see
 * `client/src/lib/attention.ts`) — nothing about it is stored. The one piece of state that *is*
 * stored is what the learner has chosen not to see: whole kinds ("stop showing me flashcards to
 * make") and individual rows ("this one writing is never getting rewritten"). It lives in the
 * settings table under `attention.*` rather than in a table of its own, because it is a handful of
 * learner preferences, not domain data.
 */

/** Every kind of row the inbox can produce. */
export const ATTENTION_KINDS = [
  "sentence-correction",
  "ungraded-sheet",
  "word-note-sentence",
  "flashcard-pending",
  "recurring-drill",
  "rule-group-ready",
  "rewrite-ready",
  "sheet-due",
] as const;

/** One kind of inbox row, from {@link ATTENTION_KINDS}. */
export type AttentionKind = (typeof ATTENTION_KINDS)[number];

/**
 * One row the learner hid. Identified by `kind` + `id` (an inbox item's id is only stable within its
 * kind); `title` is a snapshot so the "hidden" list can name the row even when the underlying item
 * has since resolved and stopped being produced.
 */
export interface HiddenAttentionItem {
  kind: AttentionKind;
  id: string;
  /** Snapshot of the row's title when it was hidden; null when it had none. */
  title: string | null;
  /** ISO timestamp the row was hidden, for ordering the hidden list. */
  hiddenAt: string;
}

/** The response of `GET /api/settings/attention`. */
export interface AttentionSettings {
  /** Kinds hidden wholesale — the group never appears, however many items it has. */
  hiddenKinds: AttentionKind[];
  /** Individually hidden rows. */
  hiddenItems: HiddenAttentionItem[];
}

/** Payload for updating the hide list. Tri-state per field: omit = leave, null/[] = clear. */
export interface UpdateAttentionSettingsInput {
  hiddenKinds?: AttentionKind[] | null;
  hiddenItems?: HiddenAttentionItem[] | null;
}

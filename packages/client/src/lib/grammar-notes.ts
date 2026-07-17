import type { GrammarNote, GrammarRelationKind } from "@sentence-bank/types";

/** Normalize a surface form for "same form" grouping (width/case-insensitive). */
function normalizeTitle(title: string): string {
  return title.trim().normalize("NFKC").toLowerCase();
}

/** A short label distinguishing one usage from another written the same way, e.g. "は — topic marker". */
export function usageLabel(note: Pick<GrammarNote, "title" | "nuance">): string {
  return note.nuance ? `${note.title} — ${note.nuance}` : note.title;
}

/** Map each grammar tag id → its note (at most one note per tag). */
export function notesByTagId(notes: GrammarNote[]): Map<string, GrammarNote> {
  return new Map(notes.map(n => [n.tagId, n]));
}

/**
 * Other notes that share this note's surface form (`title`) — the distinct usages written the same
 * way (topic は vs. contrastive は). Excludes the note itself; sorted by usage label.
 */
export function otherUsages(notes: GrammarNote[], note: GrammarNote): GrammarNote[] {
  const key = normalizeTitle(note.title);
  return notes
    .filter(n => n.id !== note.id && normalizeTitle(n.title) === key)
    .sort((a, b) => usageLabel(a).localeCompare(usageLabel(b)));
}

/** A related grammar point resolved for display, from either an outbound or inbound relation. */
export interface ResolvedRelation {
  tagId: string;
  tagName: string;
  kind: GrammarRelationKind;
  /** The relation's own note text. */
  note: string | null;
  /** The related note when one exists, so the UI can link to it and show its nuance. */
  target: GrammarNote | null;
  /** True when the link was declared on the other note (shown here because relations are bidirectional). */
  inbound: boolean;
}

/**
 * Combine this note's outbound relations with the inbound ones declared on other notes (relations are
 * shown on both related pages), deduped by the related tag id — outbound wins over inbound.
 */
export function resolvedRelations(notes: GrammarNote[], note: GrammarNote): ResolvedRelation[] {
  const byTag = notesByTagId(notes);
  const seen = new Set<string>();
  const out: ResolvedRelation[] = [];
  for (const r of note.relations) {
    if (seen.has(r.tagId)) continue;
    seen.add(r.tagId);
    out.push({
      tagId: r.tagId,
      tagName: r.tagName,
      kind: r.kind,
      note: r.note,
      target: byTag.get(r.tagId) ?? null,
      inbound: false,
    });
  }
  for (const other of notes) {
    if (other.id === note.id) continue;
    for (const r of other.relations) {
      if (r.tagId !== note.tagId || seen.has(other.tagId)) continue;
      seen.add(other.tagId);
      out.push({
        tagId: other.tagId,
        tagName: other.tagName,
        kind: r.kind,
        note: r.note,
        target: other,
        inbound: true,
      });
    }
  }
  return out;
}

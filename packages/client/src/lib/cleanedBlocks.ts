import type {
  Capture,
  CleanedBlocks,
  CleanedGroupKind,
  CleanedLine,
  CleanedLineRole,
  CreateSentenceInput,
  CreateVocabInput,
} from "@sentence-bank/types";

/**
 * Pure logic for the Cleaned Blocks workbench: seeding the editable structure from a capture,
 * deriving sentence/vocab create-inputs from the grouped lines, and the immutable reducer helpers
 * the component uses to edit the draft. Kept free of React so it can be unit-tested in isolation
 * (mirrors the `lib/parseTemplate` precedent).
 */

/** Map of ISO-ish language codes to the display names stored on sentences/vocab. */
export const LANG_NAMES: Record<string, string> = {
  "ja": "Japanese",
  "en": "English",
  "zh": "Chinese",
  "zh-Hans": "Chinese",
  "zh-Hant": "Chinese",
  "ko": "Korean",
  "es": "Spanish",
  "fr": "French",
  "de": "German",
};

/** Language codes whose text runs together without inter-word spaces when lines are rejoined. */
export const CJK_NO_SPACE = new Set(["ja", "zh", "zh-Hans", "zh-Hant"]);

/** Resolve a line's language code to a display name, falling back to the batch default. */
export function langNameFor(code: string, fallback: string): string {
  return LANG_NAMES[code] ?? fallback;
}

function newId(): string {
  return crypto.randomUUID();
}

/**
 * Join wrapped lines back into one string: no separator for CJK-without-spaces scripts (a Japanese
 * sentence broken across OCR lines rejoins seamlessly), a single space otherwise.
 */
export function joinLines(texts: string[], langCode: string): string {
  const parts = texts.map(t => t.trim()).filter(Boolean);
  const sep = CJK_NO_SPACE.has(langCode) ? "" : " ";
  return parts.join(sep);
}

/** Join a role partition using its own first line's language for the separator. */
function joinPartition(lines: CleanedLine[]): { text: string;
  lang: string; } {
  if (lines.length === 0) {
    return {
      text: "",
      lang: "",
    };
  }
  const lang = lines[0].lang;
  return {
    text: joinLines(lines.map(l => l.text), lang),
    lang,
  };
}

/**
 * Build the initial editable structure for a capture: one line per OCR block (its own singleton
 * `sentence` group). When the capture has no blocks (e.g. a manual capture), fall back to splitting
 * the cleaned/raw text on newlines.
 */
export function seedCleanedBlocks(capture: Capture): CleanedBlocks {
  const lines: CleanedLine[] = [];
  const groups: CleanedBlocks["groups"] = [];

  const pushLine = (text: string, lang: string) => {
    const group = newId();
    groups.push({
      id: group,
      kind: "sentence",
    });
    lines.push({
      id: newId(),
      text,
      lang,
      role: "text",
      group,
    });
  };

  const blocks = capture.blocks ?? [];
  if (blocks.length > 0) {
    for (const block of blocks) {
      pushLine(block.text, block.lang);
    }
  }
  else {
    const raw = capture.cleanedText ?? capture.text ?? "";
    for (const rawLine of raw.split("\n")) {
      const text = rawLine.trim();
      if (text) pushLine(text, "ja");
    }
  }

  return {
    lines,
    groups,
    ignoredLangs: [],
  };
}

/** Shared batch metadata + link suggester applied to every derived item. */
export interface DeriveOptions {
  captureId: string;
  sourceId: string | null;
  page: string;
  tags: string;
  notes: string;
  /** Fallback language name when a line's code isn't in {@link LANG_NAMES}. */
  batchLanguage: string;
  /** Existing-vocab auto-link suggestions for a sentence's text. */
  suggestLinks: (text: string) => string[];
}

export interface DerivedItems {
  sentences: CreateSentenceInput[];
  vocab: CreateVocabInput[];
  /** Groups that had visible content but produced no item (no text-role line). */
  skipped: number;
}

/**
 * Derive sentence/vocab create-inputs from the cleaned blocks. Lines whose language is ignored are
 * dropped first; the remaining lines are grouped (in first-appearance order), and each group yields
 * one item per its kind — `text` lines → the sentence text / vocab term, `translation` lines → the
 * translation / meaning, `furigana` lines → the vocab reading (ignored for sentences, which have no
 * reading field). Groups with no text-role content are skipped.
 */
export function deriveItems(cb: CleanedBlocks, opts: DeriveOptions): DerivedItems {
  const ignored = new Set(cb.ignoredLangs);
  const kindOf = new Map<string, CleanedGroupKind>(cb.groups.map(g => [g.id, g.kind]));

  const order: string[] = [];
  const byGroup = new Map<string, CleanedLine[]>();
  for (const line of cb.lines) {
    if (ignored.has(line.lang)) continue;
    let bucket = byGroup.get(line.group);
    if (!bucket) {
      bucket = [];
      byGroup.set(line.group, bucket);
      order.push(line.group);
    }
    bucket.push(line);
  }

  const sentences: CreateSentenceInput[] = [];
  const vocab: CreateVocabInput[] = [];
  let skipped = 0;

  const page = opts.page.trim() || null;
  const tags = opts.tags.trim() || null;
  const notes = opts.notes.trim() || null;

  for (const groupId of order) {
    const members = byGroup.get(groupId) ?? [];
    const textPart = joinPartition(members.filter(l => l.role === "text"));
    const primary = textPart.text;
    if (!primary) {
      skipped += 1;
      continue;
    }
    const readingPart = joinPartition(members.filter(l => l.role === "furigana"));
    const glossPart = joinPartition(members.filter(l => l.role === "translation"));
    const language = langNameFor(textPart.lang, opts.batchLanguage) || "Japanese";

    if ((kindOf.get(groupId) ?? "sentence") === "sentence") {
      sentences.push({
        text: primary,
        translation: glossPart.text || null,
        language,
        source: null,
        sourceId: opts.sourceId,
        page,
        tags,
        notes,
        captureId: opts.captureId,
        vocabIds: opts.suggestLinks(primary),
      });
    }
    else {
      vocab.push({
        term: primary,
        reading: readingPart.text || null,
        meaning: glossPart.text || null,
        language,
        sourceId: opts.sourceId,
        page,
        tags,
        notes,
        captureId: opts.captureId,
      });
    }
  }

  return {
    sentences,
    vocab,
    skipped,
  };
}

// --- Immutable reducer helpers for the editor ---

/** Drop groups no line references any more (keeps the model tidy after deletes/merges). */
function pruneGroups(cb: CleanedBlocks): CleanedBlocks {
  const used = new Set(cb.lines.map(l => l.group));
  if (cb.groups.every(g => used.has(g.id))) return cb;
  return {
    ...cb,
    groups: cb.groups.filter(g => used.has(g.id)),
  };
}

function mapLine(cb: CleanedBlocks, id: string, fn: (line: CleanedLine) => CleanedLine): CleanedBlocks {
  return {
    ...cb,
    lines: cb.lines.map(l => (l.id === id ? fn(l) : l)),
  };
}

export function updateLineText(cb: CleanedBlocks, id: string, text: string): CleanedBlocks {
  return mapLine(cb, id, l => ({
    ...l,
    text,
  }));
}

export function updateLineLang(cb: CleanedBlocks, id: string, lang: string): CleanedBlocks {
  return mapLine(cb, id, l => ({
    ...l,
    lang,
  }));
}

export function updateLineRole(cb: CleanedBlocks, id: string, role: CleanedLineRole): CleanedBlocks {
  return mapLine(cb, id, l => ({
    ...l,
    role,
  }));
}

export function moveLine(cb: CleanedBlocks, id: string, dir: "up" | "down"): CleanedBlocks {
  const idx = cb.lines.findIndex(l => l.id === id);
  if (idx < 0) return cb;
  const target = dir === "up" ? idx - 1 : idx + 1;
  if (target < 0 || target >= cb.lines.length) return cb;
  const lines = cb.lines.slice();
  [lines[idx], lines[target]] = [lines[target], lines[idx]];
  return {
    ...cb,
    lines,
  };
}

export function deleteLine(cb: CleanedBlocks, id: string): CleanedBlocks {
  return pruneGroups({
    ...cb,
    lines: cb.lines.filter(l => l.id !== id),
  });
}

/** Move a line into the group of the line directly above it (adopting that group's kind). */
export function mergeIntoPrevGroup(cb: CleanedBlocks, id: string): CleanedBlocks {
  const idx = cb.lines.findIndex(l => l.id === id);
  if (idx <= 0) return cb;
  const prevGroup = cb.lines[idx - 1].group;
  if (cb.lines[idx].group === prevGroup) return cb;
  return pruneGroups(mapLine(cb, id, l => ({
    ...l,
    group: prevGroup,
  })));
}

/** Break a line out into its own fresh `sentence` group. */
export function splitToOwnGroup(cb: CleanedBlocks, id: string): CleanedBlocks {
  const line = cb.lines.find(l => l.id === id);
  if (!line) return cb;
  const group = newId();
  return pruneGroups({
    ...cb,
    lines: cb.lines.map(l => (l.id === id
      ? {
        ...l,
        group,
      }
      : l)),
    groups: [...cb.groups, {
      id: group,
      kind: "sentence",
    }],
  });
}

export function setGroupKind(cb: CleanedBlocks, groupId: string, kind: CleanedGroupKind): CleanedBlocks {
  return {
    ...cb,
    groups: cb.groups.map(g => (g.id === groupId
      ? {
        ...g,
        kind,
      }
      : g)),
  };
}

export function toggleIgnoredLang(cb: CleanedBlocks, code: string): CleanedBlocks {
  const has = cb.ignoredLangs.includes(code);
  return {
    ...cb,
    ignoredLangs: has ? cb.ignoredLangs.filter(c => c !== code) : [...cb.ignoredLangs, code],
  };
}

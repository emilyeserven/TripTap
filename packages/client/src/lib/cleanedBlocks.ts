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

/**
 * Languages the OCR occasionally mis-fires on for Japanese material (Chinese, Vietnamese, Thai,
 * Korean). Any of these present at seed time is added to `ignoredLangs` so those lines are excluded
 * by default; the user can re-include them from the language filter bar.
 */
export const DEFAULT_IGNORED_LANGS = ["zh", "zh-Hans", "zh-Hant", "vi", "th", "ko"];

/** True when the text is entirely kana (hira/kata, incl. the prolonged mark) — i.e. a reading. */
export function isPureKana(text: string): boolean {
  const stripped = text.replace(/\s/g, "");
  if (!stripped) return false;
  // Hiragana + katakana (incl. ー), katakana phonetic extensions, and halfwidth katakana.
  return /^[぀-ヿㇰ-ㇿｦ-ﾟ]+$/.test(stripped);
}

/**
 * Character ranges treated as CJK for script segmentation: CJK punctuation, kana (incl. phonetic
 * extensions + halfwidth), Han (unified + ext-A + compatibility), and Hangul. The ideographic space
 * (U+3000) is intentionally excluded so it falls through to `\s` and is dropped between runs.
 */
const CJK_CLASS
  = "\\u3001-\\u303f\\u3040-\\u30ff\\u31f0-\\u31ff\\u3400-\\u4dbf\\u4e00-\\u9fff\\uf900-\\ufaff\\uac00-\\ud7af\\uff66-\\uff9f";
const CJK_HEAD = new RegExp(`^[${CJK_CLASS}]`);
/** Language codes retained on a CJK segment; anything else defaults CJK segments to Japanese. */
const CJK_LANG_CODES = new Set(["ja", "zh", "zh-Hans", "zh-Hant", "ko"]);

/**
 * Split text into maximal runs of CJK vs non-CJK, dropping the whitespace between runs. A block like
 * `"heel 脚后銀"` → `[{ text: "heel", cjk: false }, { text: "脚后銀", cjk: true }]`.
 */
export function segmentByScript(text: string): { text: string;
  cjk: boolean; }[] {
  const re = new RegExp(`[${CJK_CLASS}]+|[^${CJK_CLASS}\\s]+`, "g");
  return [...text.matchAll(re)].map(m => ({
    text: m[0],
    cjk: CJK_HEAD.test(m[0]),
  }));
}

/** True when the text mixes scripts, so {@link splitLineByScript} would break it apart. */
export function hasScriptBoundary(text: string): boolean {
  return segmentByScript(text).length > 1;
}

/**
 * Best-guess language code for a script segment: pure kana is always Japanese; a CJK run keeps the
 * parent line's code when it's already a CJK language, else defaults to Japanese; anything else is
 * treated as English. The user can correct it with the per-line language selector.
 */
export function guessLang(segmentText: string, cjk: boolean, parentLang: string): string {
  if (isPureKana(segmentText)) return "ja";
  if (cjk) return CJK_LANG_CODES.has(parentLang) ? parentLang : "ja";
  return "en";
}

/** Resolve a line's language code to a display name, falling back to the batch default. */
export function langNameFor(code: string, fallback: string): string {
  return LANG_NAMES[code] ?? fallback;
}

/**
 * Generate a stable id for a line/group. `crypto.randomUUID` only exists in a secure context
 * (HTTPS/localhost), so it's undefined when the app is served over plain HTTP — fall back to
 * `getRandomValues`, then `Math.random`. These ids are internal keys, not security-sensitive.
 */
function newId(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  if (c?.getRandomValues) {
    const bytes = c.getRandomValues(new Uint8Array(16));
    // RFC-4122 v4 layout.
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map(b => b.toString(16).padStart(2, "0"));
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
  }
  return `id-${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
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
 * `sentence` group). Pure-kana lines default to the `furigana` role (they're readings, not text),
 * and any {@link DEFAULT_IGNORED_LANGS} present are ignored by default. When the capture has no
 * blocks (e.g. a manual capture), fall back to splitting the cleaned/raw text on newlines.
 */
export function seedCleanedBlocks(capture: Capture): CleanedBlocks {
  const lines: CleanedLine[] = [];
  const groups: CleanedBlocks["groups"] = [];

  const pushLine = (text: string, lang: string) => {
    const group = newId();
    groups.push({
      id: group,
      kind: "sentence",
      link: null,
    });
    lines.push({
      id: newId(),
      text,
      lang,
      role: isPureKana(text) ? "furigana" : "text",
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

  const present = new Set(lines.map(l => l.lang));
  const ignoredLangs = DEFAULT_IGNORED_LANGS.filter(code => present.has(code));

  return {
    lines,
    groups,
    ignoredLangs,
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
  // Item key = the stitch's link (linked stitches derive as one item), else its own stitch id.
  const itemKeyOf = new Map<string, string>(cb.groups.map(g => [g.id, g.link ?? g.id]));

  // Bundle lines by item, keeping first-appearance order. Track each item's kind from its first
  // stitch (linked stitches keep synced kinds).
  const order: string[] = [];
  const byItem = new Map<string, CleanedLine[]>();
  const itemKind = new Map<string, CleanedGroupKind>();
  for (const line of cb.lines) {
    if (ignored.has(line.lang)) continue;
    const key = itemKeyOf.get(line.group) ?? line.group;
    let bucket = byItem.get(key);
    if (!bucket) {
      bucket = [];
      byItem.set(key, bucket);
      itemKind.set(key, kindOf.get(line.group) ?? "sentence");
      order.push(key);
    }
    bucket.push(line);
  }

  const sentences: CreateSentenceInput[] = [];
  const vocab: CreateVocabInput[] = [];
  let skipped = 0;

  const page = opts.page.trim() || null;
  const tags = opts.tags.trim() || null;
  const notes = opts.notes.trim() || null;

  for (const key of order) {
    const members = byItem.get(key) ?? [];
    const textPart = joinPartition(members.filter(l => l.role === "text"));
    const primary = textPart.text;
    if (!primary) {
      skipped += 1;
      continue;
    }
    const readingPart = joinPartition(members.filter(l => l.role === "furigana"));
    const glossPart = joinPartition(members.filter(l => l.role === "translation"));
    const language = langNameFor(textPart.lang, opts.batchLanguage) || "Japanese";

    if ((itemKind.get(key) ?? "sentence") === "sentence") {
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

/** Set the language on every line in the same stitch (continuation lines share a language). */
export function updateLineLang(cb: CleanedBlocks, id: string, lang: string): CleanedBlocks {
  const line = cb.lines.find(l => l.id === id);
  if (!line) return cb;
  return {
    ...cb,
    lines: cb.lines.map(l => (l.group === line.group
      ? {
        ...l,
        lang,
      }
      : l)),
  };
}

/** Set the role on every line in the same stitch (continuation lines share a role). */
export function updateLineRole(cb: CleanedBlocks, id: string, role: CleanedLineRole): CleanedBlocks {
  const line = cb.lines.find(l => l.id === id);
  if (!line) return cb;
  return {
    ...cb,
    lines: cb.lines.map(l => (l.group === line.group
      ? {
        ...l,
        role,
      }
      : l)),
  };
}

/**
 * Reorder `lines` into contiguous item → stitch → line runs: items (linked stitches) sit together,
 * each item's stitches are adjacent, and each stitch keeps its internal order. This keeps a whole
 * item as one block so it can move together (see {@link moveItem}) and read as a unit.
 */
export function normalizeOrder(cb: CleanedBlocks): CleanedBlocks {
  const linkOf = new Map(cb.groups.map(g => [g.id, g.link]));
  const keyOf = (line: CleanedLine) => linkOf.get(line.group) ?? line.group;

  const itemOrder: string[] = [];
  const stitchOrder = new Map<string, string[]>();
  const byStitch = new Map<string, CleanedLine[]>();
  for (const line of cb.lines) {
    const key = keyOf(line);
    let stitches = stitchOrder.get(key);
    if (!stitches) {
      stitches = [];
      stitchOrder.set(key, stitches);
      itemOrder.push(key);
    }
    let bucket = byStitch.get(line.group);
    if (!bucket) {
      bucket = [];
      byStitch.set(line.group, bucket);
      stitches.push(line.group);
    }
    bucket.push(line);
  }

  const lines = itemOrder.flatMap(key =>
    (stitchOrder.get(key) ?? []).flatMap(gid => byStitch.get(gid) ?? []));
  const changed = lines.some((l, i) => l !== cb.lines[i]);
  return changed
    ? {
      ...cb,
      lines,
    }
    : cb;
}

export function deleteLine(cb: CleanedBlocks, id: string): CleanedBlocks {
  return pruneGroups({
    ...cb,
    lines: cb.lines.filter(l => l.id !== id),
  });
}

/** Delete every selected line at once, then drop any emptied groups. */
export function deleteLines(cb: CleanedBlocks, ids: string[]): CleanedBlocks {
  const remove = new Set(ids);
  if (remove.size === 0) return cb;
  return pruneGroups({
    ...cb,
    lines: cb.lines.filter(l => !remove.has(l.id)),
  });
}

/**
 * Stitch the selected lines into a single stitch (continuation lines that concatenate into one
 * text). They join the stitch of the earliest selected line — keeping its kind/link — and are pulled
 * contiguous.
 */
export function stitchLines(cb: CleanedBlocks, ids: string[]): CleanedBlocks {
  const select = new Set(ids);
  const anchor = cb.lines.find(l => select.has(l.id));
  if (!anchor) return cb;
  const target = anchor.group;
  const relinked = {
    ...cb,
    lines: cb.lines.map(l => (select.has(l.id)
      ? {
        ...l,
        group: target,
      }
      : l)),
  };
  return normalizeOrder(pruneGroups(relinked));
}

/** Break each selected line out into its own fresh standalone stitch (unstitch). */
export function unstitchLines(cb: CleanedBlocks, ids: string[]): CleanedBlocks {
  const select = new Set(ids);
  if (select.size === 0) return cb;
  const added: CleanedBlocks["groups"] = [];
  const lines = cb.lines.map((l) => {
    if (!select.has(l.id)) return l;
    const group = newId();
    added.push({
      id: group,
      kind: "sentence",
      link: null,
    });
    return {
      ...l,
      group,
    };
  });
  return normalizeOrder(pruneGroups({
    ...cb,
    lines,
    groups: [...cb.groups, ...added],
  }));
}

/**
 * Replace `target` in place with one new standalone line per piece — each in its own fresh singleton
 * `sentence` stitch (mirroring {@link unstitchLines}), so the pieces derive as separate items. A
 * piece's role is inherited from the parent unless it's pure kana (→ `furigana`, matching
 * {@link seedCleanedBlocks}). Position is preserved by splicing the pieces where the line was.
 */
function splitInto(
  cb: CleanedBlocks,
  target: CleanedLine,
  pieces: { text: string;
    lang: string; }[],
): CleanedBlocks {
  const added: CleanedBlocks["groups"] = [];
  const replacement: CleanedLine[] = pieces.map((piece) => {
    const group = newId();
    added.push({
      id: group,
      kind: "sentence",
      link: null,
    });
    return {
      id: newId(),
      text: piece.text,
      lang: piece.lang,
      role: isPureKana(piece.text) ? "furigana" : target.role,
      group,
    };
  });
  const lines = cb.lines.flatMap(l => (l.id === target.id ? replacement : [l]));
  return normalizeOrder(pruneGroups({
    ...cb,
    lines,
    groups: [...cb.groups, ...added],
  }));
}

/**
 * Split one line whose text mixes scripts (e.g. an English gloss run together with CJK, `"heel
 * 脚后銀"`) into one standalone line per script run, each with a guessed language. No-op when the
 * line has only a single script run.
 */
export function splitLineByScript(cb: CleanedBlocks, id: string): CleanedBlocks {
  const target = cb.lines.find(l => l.id === id);
  if (!target) return cb;
  const segments = segmentByScript(target.text);
  if (segments.length < 2) return cb;
  return splitInto(
    cb,
    target,
    segments.map(seg => ({
      text: seg.text,
      lang: guessLang(seg.text, seg.cjk, target.lang),
    })),
  );
}

/**
 * Split one line into two at character offset `index` (typically the text caret), each half trimmed
 * into its own fresh standalone stitch. Both halves keep the parent's language. No-op when either
 * half is empty (caret at or beyond an edge).
 */
export function splitLineAt(cb: CleanedBlocks, id: string, index: number): CleanedBlocks {
  const target = cb.lines.find(l => l.id === id);
  if (!target) return cb;
  const left = target.text.slice(0, index).trim();
  const right = target.text.slice(index).trim();
  if (!left || !right) return cb;
  return splitInto(cb, target, [
    {
      text: left,
      lang: target.lang,
    },
    {
      text: right,
      lang: target.lang,
    },
  ]);
}

/**
 * Link the stitches owning the selected lines into one derived item (e.g. a text stitch + its
 * translation stitch → one sentence). They adopt a shared `link` id and a synced `kind`. Needs at
 * least two distinct stitches selected.
 */
export function linkGroups(cb: CleanedBlocks, ids: string[]): CleanedBlocks {
  const select = new Set(ids);
  const anchor = cb.lines.find(l => select.has(l.id));
  if (!anchor) return cb;
  const groupIds = new Set(cb.lines.filter(l => select.has(l.id)).map(l => l.group));
  if (groupIds.size < 2) return cb;
  const anchorGroup = cb.groups.find(g => g.id === anchor.group);
  const link = anchorGroup?.link ?? newId();
  const kind = anchorGroup?.kind ?? "sentence";
  const groups = cb.groups.map(g => (groupIds.has(g.id)
    ? {
      ...g,
      link,
      kind,
    }
    : g));
  return normalizeOrder({
    ...cb,
    groups,
  });
}

/** Unlink the stitches owning the selected lines back into standalone items. */
export function unlinkGroups(cb: CleanedBlocks, ids: string[]): CleanedBlocks {
  const select = new Set(ids);
  const groupIds = new Set(cb.lines.filter(l => select.has(l.id)).map(l => l.group));
  if (groupIds.size === 0) return cb;
  const groups = cb.groups.map(g => (groupIds.has(g.id)
    ? {
      ...g,
      link: null,
    }
    : g));
  return normalizeOrder({
    ...cb,
    groups,
  });
}

/** Bulk-set the role (e.g. `ignore`) on every selected line. */
export function setLinesRole(cb: CleanedBlocks, ids: string[], role: CleanedLineRole): CleanedBlocks {
  const select = new Set(ids);
  if (select.size === 0) return cb;
  return {
    ...cb,
    lines: cb.lines.map(l => (select.has(l.id)
      ? {
        ...l,
        role,
      }
      : l)),
  };
}

/**
 * Set the kind on every stitch that owns a selected line, plus every stitch linked to those (bulk
 * → Vocab / → Sentence), so linked items stay one consistent kind.
 */
export function setKindForLines(cb: CleanedBlocks, ids: string[], kind: CleanedGroupKind): CleanedBlocks {
  const select = new Set(ids);
  const groupIds = new Set(cb.lines.filter(l => select.has(l.id)).map(l => l.group));
  if (groupIds.size === 0) return cb;
  const links = new Set(
    cb.groups.filter(g => groupIds.has(g.id) && g.link != null).map(g => g.link),
  );
  return {
    ...cb,
    groups: cb.groups.map(g => (groupIds.has(g.id) || (g.link != null && links.has(g.link))
      ? {
        ...g,
        kind,
      }
      : g)),
  };
}

/**
 * Move a whole item (all stitches sharing the given stitch's link) up or down past the neighboring
 * item, so a linked block moves together. Runs through {@link normalizeOrder} first for contiguity.
 */
export function moveItem(cb: CleanedBlocks, groupId: string, dir: "up" | "down"): CleanedBlocks {
  const normalized = normalizeOrder(cb);
  const linkOf = new Map(normalized.groups.map(g => [g.id, g.link]));
  const keyOf = (line: CleanedLine) => linkOf.get(line.group) ?? line.group;

  const order: string[] = [];
  const byItem = new Map<string, CleanedLine[]>();
  for (const line of normalized.lines) {
    const key = keyOf(line);
    let bucket = byItem.get(key);
    if (!bucket) {
      bucket = [];
      byItem.set(key, bucket);
      order.push(key);
    }
    bucket.push(line);
  }
  const targetKey = linkOf.get(groupId) ?? groupId;
  const idx = order.indexOf(targetKey);
  if (idx < 0) return cb;
  const target = dir === "up" ? idx - 1 : idx + 1;
  if (target < 0 || target >= order.length) return cb;
  [order[idx], order[target]] = [order[target], order[idx]];
  return {
    ...normalized,
    lines: order.flatMap(key => byItem.get(key) ?? []),
  };
}

/** Set the kind on a stitch and every stitch sharing its link (linked items are one kind). */
export function setGroupKind(cb: CleanedBlocks, groupId: string, kind: CleanedGroupKind): CleanedBlocks {
  const group = cb.groups.find(g => g.id === groupId);
  if (!group) return cb;
  const link = group.link;
  return {
    ...cb,
    groups: cb.groups.map(g => (g.id === groupId || (link != null && g.link === link)
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

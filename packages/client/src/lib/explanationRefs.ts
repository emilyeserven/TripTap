/**
 * The "standardized explanation" convention: a line of an explanation that starts with an exact
 * phrase from the sentence followed by a colon attaches that note to that phrase — e.g.
 *
 * ```
 * は: topic marker here, not が
 * 食べました: past tense — 〜ました, not 〜ます
 * ```
 *
 * The phrase is underlined in the sentence (see `ExplainedSentence`) and the note shows on hover,
 * while the explanation is still rendered in full underneath (see `ExplanationBody`).
 *
 * A line only counts as a reference when its phrase is a **literal substring** of the target
 * sentence, so ordinary prose like `Note: remember this` is left alone. Matching is exact —
 * case and width are not normalized. The target is the corrected sentence when there is one, else
 * the learner's original, which is what lets a sentence that needed no correction still be
 * annotated.
 */

/** One `phrase: note` line that resolved against the target sentence. */
export interface ExplanationRef {
  /** An exact literal substring of the target sentence. */
  snippet: string;
  /** The note after the colon (trimmed; may contain Markdown). */
  body: string;
  /** 0-based index of the source line within the explanation. */
  line: number;
}

/** Every line of an explanation, classified — drives both rendering and the authoring hint. */
export interface ExplanationLine {
  line: number;
  /** The source line, unmodified. */
  raw: string;
  /** The phrase before the colon when the line is *shaped* like a reference; null otherwise. */
  candidate: string | null;
  /** The note after the colon when `candidate` is set. */
  body: string;
  /** Whether `candidate` is a literal substring of the target — i.e. a working reference. */
  matched: boolean;
}

/** One run of the target sentence: plain text (`refs` empty), or text covered by one or more refs. */
export interface ExplanationSegment {
  text: string;
  /** Every reference whose phrase covers exactly this run — usually one, more when notes share a phrase. */
  refs: ExplanationRef[];
}

/** Order-preserving blocks for rendering the explanation in full. */
export type ExplanationBlock
  = | { kind: "prose";
    text: string; }
    | { kind: "ref";
      ref: ExplanationRef; };

/** Only look this far into an explanation — a guard against pathological input, not a real limit. */
const MAX_LINES = 200;
/** Skip annotation entirely for absurdly long text; the quadratic scan isn't worth it. */
const MAX_TARGET_LENGTH = 5000;
/** How many nested decorations (`**`, backticks, 「」…) to peel off a snippet. */
const MAX_UNWRAP_DEPTH = 3;

/**
 * A leading list marker, which is not part of the phrase — so `- まだ:` and `・まだ:` resolve the same
 * as `まだ:`. Covers Markdown bullets (`- `, `* `, `+ `) and numbered items (`1. `, `1) `), which
 * require a trailing space, plus common bullet/dash glyphs (`•`, `‣`, `◦`, `▪`, `·`, `・`, en/em/minus
 * dashes) — including the dash-likes a Japanese keyboard produces instead of ASCII `-` — where the
 * space is optional since those glyphs aren't Markdown emphasis or ordinary sentence text.
 */
const LIST_MARKER = /^\s*(?:[-*+]\s+|[–—−‐•‣◦▪·・]\s*|\d+[.)]\s+)/;

/** Decoration pairs stripped from a phrase, so `**は**: …` and `「は」: …` still resolve. */
const WRAPPERS: [string, string][] = [
  ["**", "**"],
  ["`", "`"],
  ["*", "*"],
  ["_", "_"],
  ["\"", "\""],
  ["'", "'"],
  ["「", "」"],
  ["『", "』"],
  ["“", "”"],
];

/** Strip up to {@link MAX_UNWRAP_DEPTH} matched pairs of surrounding decoration from a phrase. */
function unwrap(value: string): string {
  let out = value.trim();
  for (let depth = 0; depth < MAX_UNWRAP_DEPTH; depth++) {
    const pair = WRAPPERS.find(([open, close]) =>
      out.length > open.length + close.length && out.startsWith(open) && out.endsWith(close));
    if (!pair) break;
    out = out.slice(pair[0].length, out.length - pair[1].length).trim();
  }
  return out;
}

/** Every index of an ASCII or full-width colon in `line`, left to right. */
function colonIndexes(line: string): number[] {
  const found: number[] = [];
  for (let i = 0; i < line.length; i++) {
    if (line[i] === ":" || line[i] === "：") found.push(i);
  }
  return found;
}

/**
 * Classify one line. The colon we split on is chosen by **what matches**, not by position: of the
 * colons whose phrase is present in `target`, we take the one yielding the longest phrase. That
 * resolves both a note containing a colon (`映画: means "film": not "movie"` → `映画`) and a phrase
 * that itself contains one (`a:b: …` where the sentence really contains `a:b`). When nothing
 * matches we fall back to the first colon, so the authoring hint can say the phrase wasn't found.
 */
function classifyLine(raw: string, index: number, target: string): ExplanationLine {
  const body = raw.replace(LIST_MARKER, "");
  const colons = colonIndexes(body);
  const plain: ExplanationLine = {
    line: index,
    raw,
    candidate: null,
    body: "",
    matched: false,
  };
  if (colons.length === 0) return plain;

  let best: ExplanationLine | null = null;
  let bestLength = 0;
  let fallback: ExplanationLine | null = null;
  for (const at of colons) {
    const candidate = unwrap(body.slice(0, at));
    const rest = body.slice(at + 1).trim();
    if (!candidate || !rest) continue;
    if (target.includes(candidate)) {
      if (candidate.length > bestLength) {
        bestLength = candidate.length;
        best = {
          line: index,
          raw,
          candidate,
          body: rest,
          matched: true,
        };
      }
      continue;
    }
    fallback ??= {
      line: index,
      raw,
      candidate,
      body: rest,
      matched: false,
    };
  }
  return best ?? fallback ?? plain;
}

/**
 * Every line of `explanation`, classified as prose or as a (matched / unmatched) reference. Callers
 * that only want the working references should use {@link parseExplanationRefs}; this fuller view
 * exists so the authoring UI can warn about a phrase that isn't in the sentence, which would
 * otherwise degrade to prose silently.
 */
export function parseExplanationLines(
  explanation: string | null | undefined,
  target: string,
): ExplanationLine[] {
  if (!explanation?.trim() || !target) return [];
  return explanation
    .split("\n")
    .slice(0, MAX_LINES)
    .map((raw, i) => classifyLine(raw, i, target));
}

/**
 * Every reference in `explanation` that resolves against `target`, in source order. Two lines can
 * share a phrase — the notes are kept separate here and shown together on that phrase's span (see
 * {@link annotateSentence}), so nothing is dropped.
 */
export function parseExplanationRefs(
  explanation: string | null | undefined,
  target: string,
): ExplanationRef[] {
  const refs: ExplanationRef[] = [];
  for (const line of parseExplanationLines(explanation, target)) {
    if (!line.matched || !line.candidate) continue;
    refs.push({
      snippet: line.candidate,
      body: line.body,
      line: line.line,
    });
  }
  return refs;
}

/**
 * Split `target` into consecutive segments, marking the ones covered by a reference. Every
 * occurrence of a phrase is annotated, so a phrase meant for one spot should include enough
 * surrounding text to be unambiguous.
 *
 * Overlaps are resolved longest-phrase-first (ties broken by the author's order), so a phrase
 * nested inside a longer one loses that span but still annotates its other occurrences. Matching is
 * done with `indexOf`, never a `RegExp` — phrases are arbitrary user text and would otherwise need
 * escaping. Concatenating the segments always reproduces `target` exactly.
 */
export function annotateSentence(target: string, refs: ExplanationRef[]): ExplanationSegment[] {
  if (!target) return [];
  if (refs.length === 0 || target.length > MAX_TARGET_LENGTH) {
    return [{
      text: target,
      refs: [],
    }];
  }

  const order = new Map(refs.map((ref, i) => [ref, i] as const));

  // Every occurrence of every phrase, merged by the exact span it covers: two notes on the same
  // phrase (same text, same place) share one interval and travel together onto that span.
  const bySpan = new Map<string, { start: number;
    end: number;
    refs: ExplanationRef[]; }>();
  refs.forEach((ref) => {
    // An empty phrase would make indexOf loop forever; a too-long one can never match.
    if (!ref.snippet || ref.snippet.length > target.length) return;
    let from = 0;
    for (;;) {
      const at = target.indexOf(ref.snippet, from);
      if (at === -1) break;
      const end = at + ref.snippet.length;
      const key = `${at}:${end}`;
      const group = bySpan.get(key);
      if (group) group.refs.push(ref);
      else {
        bySpan.set(key, {
          start: at,
          end,
          refs: [ref],
        });
      }
      from = end;
    }
  });

  const minOrder = (r: ExplanationRef[]) => Math.min(...r.map(ref => order.get(ref) ?? 0));
  const intervals = [...bySpan.values()];
  // Keep each span's notes in the author's order.
  intervals.forEach(iv => iv.refs.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0)));
  // Longest span first (ties by earliest author order, then position) so a nested phrase yields.
  intervals.sort((a, b) =>
    (b.end - b.start) - (a.end - a.start)
    || minOrder(a.refs) - minOrder(b.refs)
    || a.start - b.start);

  // Claim characters greedily in priority order, so accepted intervals can never overlap.
  const taken = Array.from({
    length: target.length,
  }, () => false);
  const accepted: typeof intervals = [];
  for (const interval of intervals) {
    let free = true;
    for (let i = interval.start; i < interval.end; i++) {
      if (taken[i]) {
        free = false;
        break;
      }
    }
    if (!free) continue;
    for (let i = interval.start; i < interval.end; i++) taken[i] = true;
    accepted.push(interval);
  }
  accepted.sort((a, b) => a.start - b.start);

  const segments: ExplanationSegment[] = [];
  let cursor = 0;
  for (const {
    start, end, refs: spanRefs,
  } of accepted) {
    if (start > cursor) {
      segments.push({
        text: target.slice(cursor, start),
        refs: [],
      });
    }
    segments.push({
      text: target.slice(start, end),
      refs: spanRefs,
    });
    cursor = end;
  }
  if (cursor < target.length) {
    segments.push({
      text: target.slice(cursor),
      refs: [],
    });
  }
  return segments;
}

/**
 * The whole explanation as ordered blocks for display: each resolved reference becomes its own
 * block (so one-per-line references don't collapse into a single Markdown paragraph), while runs of
 * ordinary lines stay together as prose and parse as normal Markdown.
 */
export function explanationBlocks(
  explanation: string | null | undefined,
  target: string,
): ExplanationBlock[] {
  const lines = parseExplanationLines(explanation, target);
  if (lines.length === 0) return [];

  const blocks: ExplanationBlock[] = [];
  let prose: string[] = [];
  const flush = () => {
    const text = prose.join("\n").trim();
    if (text) {
      blocks.push({
        kind: "prose",
        text,
      });
    }
    prose = [];
  };

  for (const line of lines) {
    if (line.matched && line.candidate) {
      flush();
      blocks.push({
        kind: "ref",
        ref: {
          snippet: line.candidate,
          body: line.body,
          line: line.line,
        },
      });
      continue;
    }
    prose.push(line.raw);
  }
  flush();
  return blocks;
}

/** One-call helper for components that need the sentence and its explanation rendered together. */
export function explainSentence(target: string, explanation: string | null | undefined): {
  refs: ExplanationRef[];
  segments: ExplanationSegment[];
  blocks: ExplanationBlock[];
  hasRefs: boolean;
} {
  const refs = parseExplanationRefs(explanation, target);
  return {
    refs,
    segments: annotateSentence(target, refs),
    blocks: explanationBlocks(explanation, target),
    hasRefs: refs.length > 0,
  };
}

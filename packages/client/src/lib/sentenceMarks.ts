import type { SentenceMark } from "@sentence-bank/types";

/** Text typed into the correction at an original character offset. */
export interface Insertion {
  at: number;
  text: string;
}

/** One rendered run of the original text: a maximal span with a single mark state (`null` = unmarked). */
export interface MarkRun {
  start: number;
  end: number;
  correct: boolean | null;
}

/** True when offset `i` falls inside any of the (non-overlapping) ranges. */
function inRanges(i: number, ranges: SentenceMark[]): boolean {
  return ranges.some(r => i >= r.start && i < r.end);
}

/**
 * Add a mark, keeping the set non-overlapping and start-sorted: any existing mark that overlaps the new
 * one is dropped (the newest wins).
 */
export function addMark(marks: SentenceMark[], next: SentenceMark): SentenceMark[] {
  const kept = marks.filter(m => m.end <= next.start || m.start >= next.end);
  return [...kept, next].sort((a, b) => a.start - b.start);
}

/** Remove the mark that starts at `start` (marks are non-overlapping, so `start` identifies one). */
export function removeMark(marks: SentenceMark[], start: number): SentenceMark[] {
  return marks.filter(m => m.start !== start);
}

/** Split `text` into contiguous runs by mark, so a flat list of `<span>`s can render each run's state. */
export function markRuns(text: string, marks: SentenceMark[]): MarkRun[] {
  const sorted = [...marks]
    .filter(m => m.start < m.end)
    .sort((a, b) => a.start - b.start);
  const runs: MarkRun[] = [];
  let i = 0;
  for (const m of sorted) {
    const s = Math.max(0, Math.min(m.start, text.length));
    const e = Math.max(0, Math.min(m.end, text.length));
    if (s < i || e <= s) continue;
    if (s > i) {
      runs.push({
        start: i,
        end: s,
        correct: null,
      });
    }
    runs.push({
      start: s,
      end: e,
      correct: m.correct,
    });
    i = e;
  }
  if (i < text.length) {
    runs.push({
      start: i,
      end: text.length,
      correct: null,
    });
  }
  return runs;
}

/**
 * Derive the corrected sentence from the learner's edits on the immutable original: drop every span
 * marked incorrect, and splice each insertion in at its original offset (correct/unmarked spans stay).
 */
export function buildCorrection(
  text: string,
  marks: SentenceMark[],
  insertions: Insertion[],
): string {
  const incorrect = marks.filter(m => !m.correct && m.start < m.end);
  const insByAt = new Map<number, string>();
  for (const ins of insertions) {
    insByAt.set(ins.at, (insByAt.get(ins.at) ?? "") + ins.text);
  }
  let out = "";
  for (let i = 0; i <= text.length; i++) {
    const ins = insByAt.get(i);
    if (ins) out += ins;
    if (i < text.length && !inRanges(i, incorrect)) out += text[i];
  }
  return out;
}

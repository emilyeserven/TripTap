import { diffChars, diffWords } from "diff";

import { cn } from "./utils";

/** CJK ranges (Han, Hiragana, Katakana) — languages without spaces between words. */
const CJK = /[぀-ヿ㐀-䶿一-鿿豈-﫿]/;

/**
 * Whether to diff by character rather than by word. Japanese/Chinese have no inter-word spaces, so a
 * word diff degenerates to whole-line replacement; a character diff is far more legible. We switch on
 * an explicit CJK language name or on the presence of CJK characters in the text.
 */
function shouldCharDiff(language: string, written: string, correct: string): boolean {
  const lang = language.toLowerCase();
  if (lang.includes("japan") || lang.includes("chin") || lang.includes("日本") || lang.includes("中")) {
    return true;
  }
  return CJK.test(written) || CJK.test(correct);
}

/**
 * A word/char-level diff of a learner's `written` sentence against its `correct` version: removed
 * spans are struck through in the destructive colour, added spans highlighted in green, unchanged
 * text left plain. Renders nothing unless both sides are present.
 */
export function CorrectionDiff({
  written,
  correct,
  language = "",
  className,
}: {
  written: string;
  correct: string | null | undefined;
  language?: string;
  className?: string;
}) {
  if (!written.trim() || !correct?.trim()) return null;

  const byChar = shouldCharDiff(language, written, correct);
  const parts = byChar ? diffChars(written, correct) : diffWords(written, correct);

  // jsdiff emits a substitution as removed (incorrect) then added (correct). Swap each such pair so the
  // corrected text reads before the struck-through original — "correct part before the incorrect part".
  const ordered: typeof parts = [];
  for (let i = 0; i < parts.length; i++) {
    if (parts[i].removed && parts[i + 1]?.added) {
      ordered.push(parts[i + 1], parts[i]);
      i++;
    }
    else {
      ordered.push(parts[i]);
    }
  }

  return (
    <p
      className={cn("text-base/relaxed", className)}
      aria-label="Diff of your sentence against the correction"
    >
      {ordered.map((part, i) => {
        if (part.added) {
          return (
            <span
              key={i}
              className="
                rounded-sm bg-emerald-500/15 text-emerald-700
                dark:text-emerald-400
              "
            >
              {part.value}
            </span>
          );
        }
        if (part.removed) {
          return (
            <span
              key={i}
              className="
                text-destructive line-through decoration-destructive/60
              "
            >
              {part.value}
            </span>
          );
        }
        return <span key={i}>{part.value}</span>;
      })}
    </p>
  );
}

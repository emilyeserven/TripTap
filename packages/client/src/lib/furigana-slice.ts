import type { FuriToken } from "@sentence-bank/types";

/**
 * Slice a furigana token array to the characters in `[start, end)` of the sentence it describes.
 *
 * Needed because some surfaces render a sentence in pieces rather than as one string —
 * {@link ExplainedSentence} splits it into referenced and un-referenced runs so each can carry its
 * own hover card. Each run still wants its own ruby, so the tokens have to be cut at the same
 * offsets the text was.
 *
 * Concatenating every token's `t` reproduces the sentence exactly, which is what makes the offsets
 * line up. A token that *straddles* a boundary (a kanji run split mid-word by a referenced phrase)
 * can't have its reading meaningfully divided, so the overlapping part is emitted as plain text with
 * no reading — the sentence still reads correctly, that run just loses its ruby.
 */
export function sliceFuriTokens(
  tokens: FuriToken[] | null | undefined,
  start: number,
  end: number,
): FuriToken[] | null {
  if (!tokens || tokens.length === 0 || end <= start) return null;

  const out: FuriToken[] = [];
  let cursor = 0;

  for (const token of tokens) {
    const tokenStart = cursor;
    const tokenEnd = cursor + token.t.length;
    cursor = tokenEnd;

    if (tokenEnd <= start) continue;
    if (tokenStart >= end) break;

    const whollyInside = tokenStart >= start && tokenEnd <= end;
    if (whollyInside) {
      out.push(token);
      continue;
    }

    // Straddles a boundary: keep the visible characters, drop the now-unalignable reading.
    const from = Math.max(tokenStart, start) - tokenStart;
    const to = Math.min(tokenEnd, end) - tokenStart;
    const text = token.t.slice(from, to);
    if (text) {
      out.push({
        t: text,
        r: null,
      });
    }
  }

  return out.length > 0 ? out : null;
}

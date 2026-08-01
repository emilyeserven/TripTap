import type { SentenceMark } from "@sentence-bank/types";
import type { JSONContent } from "@tiptap/react";

/**
 * Rebuild TipTap editor content from a corrected string and its saved {@link SentenceMark}s — the
 * inverse of `deriveCorrection`. The stored marks are `correct` spans over the corrected text (the
 * dropped `incorrect` original isn't in the string), so re-opening a correction shows the affirmed
 * spans highlighted again instead of flat, unmarked text.
 */
export function markedContent(text: string, marks: SentenceMark[] | null | undefined): JSONContent {
  const spans = (marks ?? [])
    .filter(m => m.correct && m.end > m.start)
    .sort((a, b) => a.start - b.start);

  const nodes: JSONContent[] = [];
  const push = (slice: string, marked: boolean) => {
    if (!slice) return;
    nodes.push(marked
      ? {
        type: "text",
        text: slice,
        marks: [{
          type: "correct",
        }],
      }
      : {
        type: "text",
        text: slice,
      });
  };

  let cursor = 0;
  for (const span of spans) {
    const start = Math.max(cursor, span.start);
    if (start >= text.length) break;
    push(text.slice(cursor, start), false);
    push(text.slice(start, Math.min(span.end, text.length)), true);
    cursor = Math.max(cursor, span.end);
  }
  push(text.slice(cursor), false);

  return {
    type: "doc",
    content: [{
      type: "paragraph",
      ...(nodes.length > 0
        ? {
          content: nodes,
        }
        : {}),
    }],
  };
}

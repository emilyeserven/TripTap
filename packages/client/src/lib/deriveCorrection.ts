import type { SentenceMark } from "@sentence-bank/types";
import type { JSONContent } from "@tiptap/core";

/** The corrected sentence plus the affirmed (`correct`) spans that survive into it. */
export interface DerivedCorrection {
  correction: string;
  marks: SentenceMark[];
}

/**
 * Derive the corrected sentence from a TipTap document (track-changes model): text carrying the
 * `incorrect` mark is dropped from the result, everything else (original + typed insertions) is kept, and
 * each `correct`-marked span is recorded as a {@link SentenceMark} over its offsets **in the derived
 * string**. Block nodes are joined with `"\n"`; hard breaks become `"\n"`.
 */
export function deriveCorrection(doc: JSONContent | null | undefined): DerivedCorrection {
  const marks: SentenceMark[] = [];
  let out = "";

  const walkInline = (nodes: JSONContent[]) => {
    for (const node of nodes) {
      if (node.type === "hardBreak") {
        out += "\n";
        continue;
      }
      if (node.type === "text" && node.text) {
        const names = (node.marks ?? []).map(m => m.type);
        if (names.includes("incorrect")) continue; // struck out → removed from the correction
        const start = out.length;
        out += node.text;
        if (names.includes("correct")) {
          marks.push({
            start,
            end: out.length,
            correct: true,
          });
        }
        continue;
      }
      // Any other container (e.g. a nested block) — descend into its children.
      if (node.content?.length) walkInline(node.content);
    }
  };

  const blocks = doc?.content ?? [];
  blocks.forEach((block, i) => {
    if (i > 0) out += "\n";
    walkInline(block.content ?? []);
  });

  return {
    correction: out,
    marks,
  };
}

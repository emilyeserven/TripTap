import { useMemo } from "react";

import { Markdown } from "@/components/Markdown";
import { REFERENCE_UNDERLINE } from "@/lib/explanation-styles";
import { explanationBlocks } from "@/lib/explanationRefs";
import { cn } from "@/lib/utils";

/**
 * An explanation rendered in full, as Markdown.
 *
 * Lines shaped `phrase: note` — where the phrase occurs in `target` — become their own row with the
 * phrase carrying the same dashed underline it has in the sentence above, which is what ties the
 * two together. Everything else is ordinary prose. Splitting references out this way is also what
 * keeps one-reference-per-line from collapsing into a single paragraph, since Markdown treats a
 * lone newline as a space.
 *
 * `target` must be the same string passed to the matching `ExplainedSentence`, or a phrase could
 * underline in one place and not the other.
 */
export function ExplanationBody({
  explanation,
  target,
  className,
}: {
  explanation: string | null | undefined;
  target: string;
  className?: string;
}) {
  const blocks = useMemo(() => explanationBlocks(explanation, target), [explanation, target]);
  if (blocks.length === 0) return null;

  return (
    <div className={cn("space-y-1 text-sm", className)}>
      {blocks.map((block, i) =>
        (block.kind === "prose"
          ? (
            <Markdown
              key={i}
              content={block.text}
            />
          )
          : (
            <div
              key={i}
              className="flex flex-wrap items-baseline gap-x-1.5"
            >
              <span className={cn("shrink-0 font-medium", REFERENCE_UNDERLINE)}>
                {block.ref.snippet}
              </span>
              {/* Drop the paragraph margins so the note sits on the phrase's baseline. */}
              <Markdown
                content={block.ref.body}
                className="
                  min-w-0
                  [&>p]:my-0
                "
              />
            </div>
          )))}
    </div>
  );
}

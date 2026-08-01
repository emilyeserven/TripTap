import type { ExplanationSegment } from "@/lib/explanationRefs";

import { useMemo } from "react";

import { Markdown } from "@/components/Markdown";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { REFERENCE_UNDERLINE } from "@/lib/explanation-styles";
import { annotateSentence, parseExplanationRefs } from "@/lib/explanationRefs";
import { cn } from "@/lib/utils";

/** One referenced run of the sentence: dashed-underlined, with its note on hover or focus. */
function ReferenceSpan({
  segment,
}: {
  segment: ExplanationSegment & { ref: NonNullable<ExplanationSegment["ref"]> };
}) {
  return (
    <HoverCard
      openDelay={80}
      closeDelay={80}
    >
      {/*
        A `span` rather than a `button`: this renders inline inside a sentence, and an inline-block
        button refuses to wrap mid-phrase. `asChild` also keeps Radix from emitting its default
        anchor, which would be invalid nested inside a link.
      */}
      <HoverCardTrigger asChild>
        <span
          tabIndex={0}
          className={cn(
            REFERENCE_UNDERLINE,
            `
              cursor-help rounded-sm outline-none
              hover:decoration-foreground
              focus-visible:ring-2 focus-visible:ring-ring
            `,
          )}
        >
          {segment.text}
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-72">
        <p className="mb-1 text-xs font-medium text-muted-foreground">{segment.ref.snippet}</p>
        <Markdown content={segment.ref.body} />
      </HoverCardContent>
    </HoverCard>
  );
}

/**
 * A sentence with the parts its explanation refers to underlined. An explanation line shaped
 * `phrase: note`, where `phrase` occurs verbatim in `text`, underlines every occurrence of that
 * phrase and shows the note on hover/focus (see `lib/explanationRefs`).
 *
 * The hover card is an enhancement, not the only way to read a note: `ExplanationBody` renders the
 * same content in full below, which is what serves touch users and screen readers. When nothing
 * resolves this renders exactly the plain sentence, so it drops in anywhere without changing the
 * look of existing content.
 */
export function ExplainedSentence({
  text,
  explanation,
  className,
}: {
  text: string;
  explanation: string | null | undefined;
  className?: string;
}) {
  const segments = useMemo(
    () => annotateSentence(text, parseExplanationRefs(explanation, text)),
    [text, explanation],
  );

  return (
    <p className={className}>
      {segments.map((segment, i) =>
        (segment.ref
          ? (
            <ReferenceSpan
              key={i}
              segment={{
                ...segment,
                ref: segment.ref,
              }}
            />
          )
          : <span key={i}>{segment.text}</span>))}
    </p>
  );
}

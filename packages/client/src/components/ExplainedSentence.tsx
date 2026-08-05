import type { ExplanationSegment } from "@/lib/explanationRefs";
import type { FuriToken } from "@sentence-bank/types";

import { useMemo } from "react";

import { Markdown } from "@/components/Markdown";
import { SentenceText } from "@/components/SentenceText";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { REFERENCE_HIGHLIGHT, REFERENCE_UNDERLINE } from "@/lib/explanation-styles";
import { annotateSentence, parseExplanationRefs } from "@/lib/explanationRefs";
import { sliceFuriTokens } from "@/lib/furigana-slice";
import { cn } from "@/lib/utils";

/**
 * One referenced run of the sentence: dashed-underlined, with its note(s) on hover or focus. When
 * several notes share the phrase, they all show in the one hover card, stacked. `highlighted` gives
 * the span a background when its note is hovered elsewhere (the note list below).
 */
function ReferenceSpan({
  segment,
  reading,
  highlighted,
}: {
  segment: ExplanationSegment;
  /** This run's slice of the sentence's furigana, or null when there is none. */
  reading: FuriToken[] | null;
  highlighted: boolean;
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
            highlighted && REFERENCE_HIGHLIGHT,
          )}
        >
          <SentenceText
            text={segment.text}
            reading={reading}
          />
        </span>
      </HoverCardTrigger>
      <HoverCardContent className="w-72 space-y-2">
        {segment.refs.map((ref, i) => (
          <div key={`${ref.line}-${i}`}>
            <p className="mb-1 text-xs font-medium text-muted-foreground">{ref.snippet}</p>
            <Markdown content={ref.body} />
          </div>
        ))}
      </HoverCardContent>
    </HoverCard>
  );
}

/**
 * A sentence with the parts its explanation refers to underlined. An explanation line shaped
 * `phrase: note`, where `phrase` occurs verbatim in `text`, underlines every occurrence of that
 * phrase and shows the note(s) on hover/focus (see `lib/explanationRefs`).
 *
 * The hover card is an enhancement, not the only way to read a note: `ExplanationBody` renders the
 * same content in full below, which is what serves touch users and screen readers. When nothing
 * resolves this renders exactly the plain sentence, so it drops in anywhere without changing the
 * look of existing content. Pass `highlightSnippet` to background-highlight the span for a phrase
 * whose note is being hovered elsewhere.
 */
export function ExplainedSentence({
  text,
  explanation,
  reading,
  className,
  highlightSnippet,
}: {
  text: string;
  explanation: string | null | undefined;
  /**
   * Generated furigana for {@link text}. Sliced per run so ruby survives the split into referenced
   * and un-referenced segments; omit it (or pass null) to render the sentence plain.
   */
  reading?: FuriToken[] | null;
  className?: string;
  /** The phrase to highlight in the sentence (from hovering its note in `ExplanationBody`). */
  highlightSnippet?: string | null;
}) {
  const segments = useMemo(
    () => annotateSentence(text, parseExplanationRefs(explanation, text)),
    [text, explanation],
  );

  // Segments are contiguous and in order, so a running offset recovers each one's span in `text` —
  // which is what the token slice has to match.
  const withReadings = useMemo(() => {
    let offset = 0;
    return segments.map((segment) => {
      const start = offset;
      offset += segment.text.length;
      return {
        segment,
        reading: sliceFuriTokens(reading, start, offset),
      };
    });
  }, [segments, reading]);

  return (
    <p className={className}>
      {withReadings.map(({
        segment, reading: segmentReading,
      }, i) =>
        (segment.refs.length > 0
          ? (
            <ReferenceSpan
              key={i}
              segment={segment}
              reading={segmentReading}
              highlighted={Boolean(highlightSnippet)
                && segment.refs.some(ref => ref.snippet === highlightSnippet)}
            />
          )
          : (
            <SentenceText
              key={i}
              text={segment.text}
              reading={segmentReading}
            />
          )))}
    </p>
  );
}

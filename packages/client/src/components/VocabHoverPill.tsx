import type { Vocab } from "@sentence-bank/types";

import { Furi } from "./ai-lesson/Furi";
import { useFurigana } from "./ai-lesson/furigana-context";
import { speak } from "./ai-lesson/speak";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

/**
 * An inline chip for a linked bank vocab (a sentence's "break it down"). Tap to hear it; hover to see
 * its reading and meaning. The reading ruby honors the global furigana toggle.
 */
export function VocabHoverPill({
  vocab,
}: { vocab: Vocab }) {
  const showFuri = useFurigana();

  const chip = (
    <button
      type="button"
      onClick={() => speak(vocab.term)}
      className="
        inline-flex items-center rounded-md border bg-muted px-1.5 py-0.5
        text-sm
        hover:bg-accent
      "
      title="Tap to hear"
    >
      {showFuri && vocab.reading
        ? (
          <ruby>
            {vocab.term}
            <rt
              className="
                text-[0.55em] font-normal text-muted-foreground select-none
              "
            >
              {vocab.reading}
            </rt>
          </ruby>
        )
        : vocab.term}
    </button>
  );

  if (!vocab.reading && !vocab.meaning) return chip;

  return (
    <HoverCard
      openDelay={80}
      closeDelay={80}
    >
      <HoverCardTrigger asChild>{chip}</HoverCardTrigger>
      <HoverCardContent className="w-56 space-y-1">
        <div className="text-base font-medium">
          <Furi
            kanji={vocab.term}
            yomi={vocab.reading ?? ""}
          />
        </div>
        {vocab.reading ? <div className="text-sm text-muted-foreground">{vocab.reading}</div> : null}
        {vocab.meaning ? <div className="text-sm">{vocab.meaning}</div> : null}
      </HoverCardContent>
    </HoverCard>
  );
}

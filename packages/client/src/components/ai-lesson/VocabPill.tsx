import { Furi } from "./Furi";
import { useFurigana } from "./furigana-context";
import { LevelBadge } from "./LevelBadge";
import { speak } from "./speak";
import { useVocabMap } from "./vocab-map-context";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

/** An inline vocab chip. Click to hear it; hover to see its reading, gloss, and level. */
export function VocabPill({
  term,
}: { term: string }) {
  const entry = useVocabMap()[term];
  const showFuri = useFurigana();

  const chip = (
    <button
      type="button"
      onClick={() => speak(term)}
      className="
        inline-flex items-center rounded-md border bg-muted px-1.5 py-0.5
        text-sm
        hover:bg-accent
      "
      title="Tap to hear"
    >
      {showFuri && entry?.yomi
        ? (
          <ruby>
            {term}
            <rt
              className="
                text-[0.55em] font-normal text-muted-foreground select-none
              "
            >{entry.yomi}
            </rt>
          </ruby>
        )
        : term}
    </button>
  );

  if (!entry) return chip;

  return (
    <HoverCard
      openDelay={80}
      closeDelay={80}
    >
      <HoverCardTrigger asChild>{chip}</HoverCardTrigger>
      <HoverCardContent className="w-56 space-y-1">
        <div className="text-base font-medium">
          <Furi
            kanji={term}
            yomi={entry.yomi}
          />
        </div>
        <div className="text-sm text-muted-foreground">{entry.yomi}</div>
        <div className="text-sm">{entry.en}</div>
        <LevelBadge lvl={entry.lvl} />
      </HoverCardContent>
    </HoverCard>
  );
}

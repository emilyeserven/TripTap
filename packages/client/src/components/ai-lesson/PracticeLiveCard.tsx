import type { VocabItem } from "@sentence-bank/types";

import { Check, RotateCcw, Volume2 } from "lucide-react";

import { Furi } from "./Furi";
import { LevelBadge } from "./LevelBadge";
import { speak } from "./speak";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

/** One live flashcard: the prompt (with audio for Japanese), the reveal, and the self-grade row. */
export function PracticeLiveCard({
  card,
  index,
  deckSize,
  promptIsJp,
  reveal,
  onReveal,
  onQuit,
  onMark,
}: {
  card: VocabItem;
  index: number;
  deckSize: number;
  promptIsJp: boolean;
  reveal: boolean;
  onReveal: () => void;
  onQuit: () => void;
  onMark: (good: boolean) => void;
}) {
  const progress = Math.round((index / deckSize) * 100);
  return (
    <div className="space-y-4">
      <Progress value={progress} />
      <div
        className="
          flex items-center justify-between text-sm text-muted-foreground
        "
      >
        <span>
          {index + 1}
          {" / "}
          {deckSize}
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={onQuit}
        >Quit
        </Button>
      </div>
      <Card>
        <CardContent
          className="
            flex min-h-40 flex-col items-center justify-center gap-3 py-6
            text-center
          "
        >
          <div className="text-2xl">
            {promptIsJp
              ? (
                <Furi
                  kanji={card.jp}
                  yomi={card.yomi}
                />
              )
              : card.en}
          </div>
          {promptIsJp && (
            <Button
              size="icon"
              variant="secondary"
              className="size-8"
              aria-label="Hear"
              onClick={() => speak(card.jp)}
            >
              <Volume2 className="size-4" />
            </Button>
          )}
          {reveal
            ? (
              <div className="space-y-1">
                <div className="text-lg font-medium">
                  {promptIsJp
                    ? card.en
                    : (
                      <Furi
                        kanji={card.jp}
                        yomi={card.yomi}
                      />
                    )}
                </div>
                <div className="text-sm text-muted-foreground">{card.yomi}</div>
                <LevelBadge lvl={card.lvl} />
              </div>
            )
            : (
              <Button
                variant="outline"
                onClick={onReveal}
              >Show answer
              </Button>
            )}
        </CardContent>
      </Card>
      {reveal && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onMark(false)}
          >
            <RotateCcw className="size-4" />
            Review again
          </Button>
          <Button
            className="flex-1"
            onClick={() => onMark(true)}
          >
            <Check className="size-4" />
            Got it
          </Button>
        </div>
      )}
    </div>
  );
}

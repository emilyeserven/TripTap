import type { PracticeSentence } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";
import { Pencil, Volume2 } from "lucide-react";

import { speak } from "./ai-lesson/speak";
import { PracticeSentenceBreakdown } from "./PracticeSentenceBreakdown";
import { PracticeSentenceCardMeta } from "./PracticeSentenceCardMeta";
import { SentenceTranslationReveal } from "./SentenceTranslationReveal";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** The study passes, in order, with short labels for the card summary. */
const PASS_LABELS: { k: keyof NonNullable<PracticeSentence["passes"]>;
  short: string; }[] = [
  {
    k: "read",
    short: "read aloud",
  },
  {
    k: "guess",
    short: "guessed",
  },
  {
    k: "lookup",
    short: "looked up",
  },
  {
    k: "produce",
    short: "produced",
  },
  {
    k: "card",
    short: "carded",
  },
];

interface PracticeSentenceCardProps {
  practiceSentence: PracticeSentence;
  showTranslation?: boolean;
  /** Resolved taxonomy source name, when the sentence references one. */
  sourceName?: string | null;
}

export function PracticeSentenceCard({
  practiceSentence: ps,
  showTranslation = true,
  sourceName,
}: PracticeSentenceCardProps) {
  const donePasses = PASS_LABELS.filter(p => ps.passes?.[p.k]);

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="size-6 shrink-0"
              aria-label="Hear"
              onClick={() => speak(ps.text)}
            >
              <Volume2 className="size-4" />
            </Button>
            <Link
              to="/practice/$id"
              params={{
                id: ps.id,
              }}
              className="
                text-lg font-semibold
                hover:underline
              "
            >
              {ps.text}
            </Link>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              asChild
              size="icon"
              variant="ghost"
              className="size-7"
              aria-label="Edit"
            >
              <Link
                to="/practice/$id/edit"
                params={{
                  id: ps.id,
                }}
              >
                <Pencil className="size-4" />
              </Link>
            </Button>
          </div>
        </div>

        {ps.reading ? <p className="text-sm text-muted-foreground">{ps.reading}</p> : null}

        <SentenceTranslationReveal
          translation={ps.translation}
          showTranslation={showTranslation}
        />

        <PracticeSentenceCardMeta
          practiceSentence={ps}
          sourceName={sourceName}
        />

        {ps.nuance ? <p className="text-sm">{ps.nuance}</p> : null}

        {donePasses.length > 0
          ? (
            <div className="flex flex-wrap gap-1.5">
              {donePasses.map(p => (
                <Badge
                  key={p.k}
                  variant="outline"
                  className="text-xs"
                >
                  {p.short}
                </Badge>
              ))}
            </div>
          )
          : null}

        <PracticeSentenceBreakdown
          words={ps.words ?? []}
          grammar={ps.grammar ?? []}
        />
      </CardContent>
    </Card>
  );
}

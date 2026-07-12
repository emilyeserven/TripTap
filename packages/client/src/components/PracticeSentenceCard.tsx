import type { PracticeSentence } from "@sentence-bank/types";

import { useState } from "react";

import { Link } from "@tanstack/react-router";
import { Camera, ChevronDown, Database, Pencil, ScrollText, TriangleAlert, Volume2 } from "lucide-react";

import { speak } from "./lesson/speak";

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
  onDelete?: (id: string) => void;
}

export function PracticeSentenceCard({
  practiceSentence: ps,
  showTranslation = true,
  sourceName,
  onDelete,
}: PracticeSentenceCardProps) {
  const [revealed, setRevealed] = useState(false);
  const [showBreak, setShowBreak] = useState(false);

  const pageLabel = ps.page ? `p. ${ps.page}` : null;
  const words = ps.words ?? [];
  const grammar = ps.grammar ?? [];
  const donePasses = PASS_LABELS.filter(p => ps.passes?.[p.k]);
  const hasBreakdown = words.length > 0 || grammar.length > 0;

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
            <p className="text-lg font-semibold">{ps.text}</p>
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
                to="/practice/$id"
                params={{
                  id: ps.id,
                }}
              >
                <Pencil className="size-4" />
              </Link>
            </Button>
            {onDelete
              ? (
                <button
                  type="button"
                  onClick={() => onDelete(ps.id)}
                  className="
                    text-sm text-destructive
                    hover:underline
                  "
                >
                  Delete
                </button>
              )
              : null}
          </div>
        </div>

        {ps.reading ? <p className="text-sm text-muted-foreground">{ps.reading}</p> : null}

        {ps.translation
          ? (
            showTranslation
              ? <p className="text-sm text-muted-foreground">{ps.translation}</p>
              : (
                <button
                  type="button"
                  onClick={() => setRevealed(v => !v)}
                  className="
                    w-full rounded-md border bg-muted/40 px-3 py-2 text-left
                    text-sm
                    hover:bg-muted
                  "
                >
                  {revealed ? ps.translation : "Reveal translation"}
                </button>
              )
          )
          : null}

        <div
          className="
            flex flex-wrap items-center gap-2 text-xs text-muted-foreground
          "
        >
          <Badge variant="secondary">{ps.language}</Badge>
          {ps.needsCorrection
            ? (
              <Badge
                variant="outline"
                className="gap-1 border-destructive/40 text-destructive"
                title="Not professionally written — may need corrections"
              >
                <TriangleAlert className="size-3" />
                Needs correction
              </Badge>
            )
            : null}
          {ps.target
            ? (
              <Badge
                className="gap-1"
                title={ps.targetKind ?? undefined}
              >
                {ps.target}
              </Badge>
            )
            : null}
          {ps.register ? <span>{ps.register}</span> : null}
          {ps.sourceId && sourceName
            ? (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-6 gap-1 px-2"
              >
                <Link
                  to="/sources/$id"
                  params={{
                    id: ps.sourceId,
                  }}
                >
                  <Database className="size-3" />
                  {sourceName}
                </Link>
              </Button>
            )
            : null}
          {pageLabel ? <span>{pageLabel}</span> : null}
          {ps.captureId
            ? (
              <Link
                to="/captures/$id"
                params={{
                  id: ps.captureId,
                }}
                className="
                  inline-flex items-center gap-1
                  hover:text-foreground
                "
              >
                <Camera className="size-3" />
                Capture
              </Link>
            )
            : null}
          {ps.sentenceId
            ? (
              <Link
                to="/sentences"
                className="
                  inline-flex items-center gap-1
                  hover:text-foreground
                "
              >
                <ScrollText className="size-3" />
                From a sentence
              </Link>
            )
            : null}
        </div>

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

        {hasBreakdown
          ? (
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBreak(v => !v)}
              >
                {showBreak ? "Hide breakdown" : "Break it down"}
                <ChevronDown
                  className={`
                    size-4 transition-transform
                    ${showBreak
              ? "rotate-180"
              : ""}
                  `}
                />
              </Button>
              {showBreak
                ? (
                  <div className="mt-2 space-y-3 rounded-md border p-3 text-sm">
                    {words.length > 0
                      ? (
                        <div>
                          <p
                            className="
                              mb-1 text-xs font-medium text-muted-foreground
                              uppercase
                            "
                          >Words
                          </p>
                          <ul className="space-y-0.5">
                            {words.map((w, i) => (
                              <li key={i}>
                                <span className="font-medium">{w.w}</span>
                                {w.r ? <span className="text-muted-foreground">{` (${w.r})`}</span> : null}
                                {w.m ? ` — ${w.m}` : null}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )
                      : null}
                    {grammar.length > 0
                      ? (
                        <div>
                          <p
                            className="
                              mb-1 text-xs font-medium text-muted-foreground
                              uppercase
                            "
                          >Grammar
                          </p>
                          <ul className="space-y-0.5">
                            {grammar.map((g, i) => (
                              <li key={i}>
                                <span className="font-medium">{g.p}</span>
                                {g.n ? ` — ${g.n}` : null}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )
                      : null}
                  </div>
                )
                : null}
            </div>
          )
          : null}
      </CardContent>
    </Card>
  );
}

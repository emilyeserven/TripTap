import type { MySentence } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";
import { NotebookPen, PenLine, TriangleAlert } from "lucide-react";

import { CorrectionDiff } from "../lib/sentenceDiff";
import { groupTermsByCategory, TERM_CATEGORIES } from "../lib/terms";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

/** Read-only detail of one My Sentence: the written text, a diff against its correction, the
 * intended/actual meaning, an explanation, and its tags. */
export function MySentenceView({
  mySentence: ms,
}: {
  mySentence: MySentence;
}) {
  const termGroups = groupTermsByCategory(ms.terms ?? []);

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <p className="text-xl font-semibold">{ms.text}</p>

        <div
          className="
            flex flex-wrap items-center gap-2 text-xs text-muted-foreground
          "
        >
          <Badge variant="secondary">{ms.language}</Badge>
          {ms.needsCorrection
            ? (
              <Badge
                variant="outline"
                className="gap-1 border-destructive/40 text-destructive"
              >
                <TriangleAlert className="size-3" />
                Needs correction
              </Badge>
            )
            : <Badge variant="outline">Corrected</Badge>}
          {ms.practiceSentenceId
            ? (
              <Link
                to="/practice/$id"
                params={{
                  id: ms.practiceSentenceId,
                }}
                className="
                  inline-flex items-center gap-1
                  hover:text-foreground
                "
              >
                <NotebookPen className="size-3" />
                From practice
              </Link>
            )
            : null}
          {ms.writingId
            ? (
              <Link
                to="/my-writing"
                className="
                  inline-flex items-center gap-1
                  hover:text-foreground
                "
              >
                <PenLine className="size-3" />
                From writing
              </Link>
            )
            : null}
          {TERM_CATEGORIES.map(({
            category, label,
          }) => {
            const terms = termGroups[category];
            if (terms.length === 0) return null;
            return (
              <span
                key={category}
                className="inline-flex flex-wrap items-center gap-1"
              >
                <span>{label}:</span>
                {terms.map(term => (
                  <Badge
                    key={`${term.sourceId}:${term.id}`}
                    variant="outline"
                    title={term.sourceLabel ? `${term.sourceLabel} (${term.kind})` : undefined}
                  >
                    {term.name}
                  </Badge>
                ))}
              </span>
            );
          })}
        </div>

        {ms.correction
          ? (
            <div className="space-y-1">
              <Label className="text-sm">Correction</Label>
              <div className="space-y-1 rounded-md border bg-muted/30 p-3">
                <CorrectionDiff
                  written={ms.text}
                  correct={ms.correction}
                  language={ms.language}
                />
                <p className="text-base">{ms.correction}</p>
              </div>
            </div>
          )
          : null}

        {ms.explanation
          ? (
            <div className="space-y-1">
              <Label className="text-sm">Explanation</Label>
              <p className="text-sm">{ms.explanation}</p>
            </div>
          )
          : null}

        <div
          className="
            grid gap-4
            sm:grid-cols-2
          "
        >
          {ms.translation
            ? (
              <div className="space-y-1">
                <Label className="text-sm">Intended meaning</Label>
                <p className="text-sm text-muted-foreground">{ms.translation}</p>
              </div>
            )
            : null}
          {ms.actualMeaning
            ? (
              <div className="space-y-1">
                <Label className="text-sm">What it actually says</Label>
                <p className="text-sm text-muted-foreground">{ms.actualMeaning}</p>
              </div>
            )
            : null}
        </div>
      </CardContent>
    </Card>
  );
}

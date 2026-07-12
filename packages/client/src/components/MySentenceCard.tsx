import type { MySentence } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";
import { NotebookPen, PenLine, TriangleAlert } from "lucide-react";

import { CorrectionDiff } from "../lib/sentenceDiff";
import { groupTermsByCategory, TERM_CATEGORIES } from "../lib/terms";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * One learner-produced sentence in the list — a compact, read-only summary that links to its own view
 * and edit pages. When a correction exists it's previewed as a word/char diff against the written
 * sentence.
 */
export function MySentenceCard({
  mySentence: ms,
  onDelete,
}: {
  mySentence: MySentence;
  onDelete?: (id: string) => void;
}) {
  const termGroups = groupTermsByCategory(ms.terms ?? []);

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <Link
            to="/my-sentences/$id"
            params={{
              id: ms.id,
            }}
            className="
              text-lg font-semibold
              hover:underline
            "
          >
            {ms.text}
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              asChild
              variant="ghost"
              size="sm"
            >
              <Link
                to="/my-sentences/$id/edit"
                params={{
                  id: ms.id,
                }}
              >
                Edit
              </Link>
            </Button>
            {onDelete
              ? (
                <button
                  type="button"
                  onClick={() => onDelete(ms.id)}
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

        {ms.correction
          ? (
            <div className="rounded-md border bg-muted/30 p-2">
              <CorrectionDiff
                written={ms.text}
                correct={ms.correction}
                language={ms.language}
              />
            </div>
          )
          : null}

        {ms.translation ? <p className="text-sm text-muted-foreground">Meant: {ms.translation}</p> : null}

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
                to="/my-writing/$id"
                params={{
                  id: ms.writingId,
                }}
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
      </CardContent>
    </Card>
  );
}

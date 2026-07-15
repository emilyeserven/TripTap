import type { MySentence } from "@sentence-bank/types";

import { useState } from "react";

import { Link } from "@tanstack/react-router";
import { Eye, EyeOff, NotebookPen, PenLine, TriangleAlert } from "lucide-react";

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
  onEdit,
}: {
  mySentence: MySentence;
  /** When provided, "Edit" becomes an in-page button (this callback) instead of a link to the edit
   * route — used where the sentence is edited inline, e.g. within a lesson. */
  onEdit?: (id: string) => void;
}) {
  const termGroups = groupTermsByCategory(ms.terms ?? []);
  const corrected = ms.correction?.trim() ? ms.correction : null;
  const [showOriginal, setShowOriginal] = useState(false);

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
            {corrected ?? ms.text}
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            {onEdit
              ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(ms.id)}
                >
                  Edit
                </Button>
              )
              : (
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
              )}
          </div>
        </div>

        {corrected
          ? (
            <div className="space-y-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowOriginal(v => !v)}
              >
                {showOriginal
                  ? <EyeOff className="size-4" />
                  : (
                    <Eye
                      className="size-4"
                    />
                  )}
                {showOriginal ? "Hide original" : "Show your original"}
              </Button>
              {showOriginal
                ? (
                  <div className="space-y-1 rounded-md border bg-muted/30 p-2">
                    <CorrectionDiff
                      written={ms.text}
                      correct={corrected}
                      language={ms.language}
                    />
                  </div>
                )
                : null}
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
          {!corrected && ms.needsCorrection
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

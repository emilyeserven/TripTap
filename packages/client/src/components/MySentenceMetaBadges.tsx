import type { MySentence } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";
import { NotebookPen, PenLine, TriangleAlert } from "lucide-react";

import { TermCategoryBadges } from "@/components/TermCategoryBadges";
import { Badge } from "@/components/ui/badge";

/**
 * The metadata badge row shared by the My Sentence card and detail view: language, the
 * needs-correction/corrected state, origin links (practice / writing), and the term badges.
 */
export function MySentenceMetaBadges({
  mySentence: ms,
}: {
  mySentence: MySentence;
}) {
  const corrected = ms.correction?.trim() ? ms.correction : null;
  return (
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
      <TermCategoryBadges terms={ms.terms} />
    </div>
  );
}

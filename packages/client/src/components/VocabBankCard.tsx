import type { Vocab } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";
import { Camera } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface VocabBankCardProps {
  vocab: Vocab;
  /** Resolved taxonomy source name, when the vocab references one. */
  sourceName?: string | null;
  /** Vocab has no edit page, so (per the delete-only-on-edit-page convention) this is the one listing
   * that keeps a delete — callers guard it with a confirm to avoid accidental deletion. */
  onDelete?: (id: string) => void;
}

/** A single standalone vocab entry (term / reading / meaning), peer of {@link SentenceCard}. */
export function VocabBankCard({
  vocab: v, sourceName, onDelete,
}: VocabBankCardProps) {
  const meta = [sourceName, v.page ? `p. ${v.page}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-lg font-semibold">{v.term}</p>
          {onDelete
            ? (
              <button
                type="button"
                onClick={() => onDelete(v.id)}
                className="
                  text-xs text-destructive
                  hover:underline
                "
              >
                Delete
              </button>
            )
            : null}
        </div>
        {v.reading ? <p className="text-sm text-muted-foreground">{v.reading}</p> : null}
        {v.meaning ? <p className="text-sm">{v.meaning}</p> : null}
        <div
          className="
            flex flex-wrap items-center gap-2 text-xs text-muted-foreground
          "
        >
          {meta ? <span>{meta}</span> : null}
          {v.captureId
            ? (
              <Link
                to="/captures/$id"
                params={{
                  id: v.captureId,
                }}
                className="
                  inline-flex items-center gap-1
                  hover:text-blue-700
                "
              >
                <Camera className="size-3" />
                Capture
              </Link>
            )
            : null}
        </div>
      </CardContent>
    </Card>
  );
}

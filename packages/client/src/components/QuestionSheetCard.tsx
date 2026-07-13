import type { QuestionSheet } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { questionSheetSlots } from "@/lib/answer-sheets";

/** Compact list-item for one Question Sheet: title link, layout + slot count, and a Delete action. */
export function QuestionSheetCard({
  questionSheet: qs,
  onDelete,
}: {
  questionSheet: QuestionSheet;
  onDelete: (id: string) => void;
}) {
  const slotCount = questionSheetSlots(qs).length;
  const resourceTerms = qs.resourceTerms ?? [];

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <Link
            to="/question-sheets/$id"
            params={{
              id: qs.id,
            }}
            className="
              text-lg font-semibold
              hover:underline
            "
          >
            {qs.title}
          </Link>
          <button
            type="button"
            className="
              text-sm text-destructive
              hover:underline
            "
            onClick={() => onDelete(qs.id)}
          >
            Delete
          </button>
        </div>
        <div
          className="
            flex flex-wrap items-center gap-2 text-xs text-muted-foreground
          "
        >
          <Badge variant="secondary">{qs.layout === "grid" ? "Grid" : "List"}</Badge>
          {qs.page ? <Badge variant="outline">Page {qs.page}</Badge> : null}
          <span>{slotCount} {slotCount === 1 ? "slot" : "slots"}</span>
          {resourceTerms.map(term => (
            <Badge
              key={`${term.sourceId}:${term.id}`}
              variant="outline"
            >
              {term.name}
            </Badge>
          ))}
        </div>
        <div>
          <Button
            asChild
            variant="outline"
            size="sm"
          >
            <Link
              to="/answer-sheets/new"
              search={{
                questionSheetId: qs.id,
              }}
            >
              Answer this sheet
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

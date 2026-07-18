import type { QuestionSheet } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";
import { CalendarCheck } from "lucide-react";

import { LearningAreaBadges } from "@/components/LearningAreaBadges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAnswerSheets } from "@/hooks/useAnswerSheets";
import { useBookmarksSettings } from "@/hooks/useSettings";
import { dueDateMet, questionSheetSlots } from "@/lib/answer-sheets";
import { bookmarkAppUrl } from "@/lib/bookmarks";
import { formatDueDate, isOverdue } from "@/lib/due-date";

/** Compact list-item for one Question Sheet: title link, layout + slot count. */
export function QuestionSheetCard({
  questionSheet: qs,
}: {
  questionSheet: QuestionSheet;
}) {
  const slotCount = questionSheetSlots(qs).length;
  // One shared, cached query for all answer sheets — filtered here rather than one request per card.
  const answerSheets = useAnswerSheets();
  const {
    data: bookmarksSettings,
  } = useBookmarksSettings();
  const met = dueDateMet(qs, (answerSheets.data ?? []).filter(as => as.questionSheetId === qs.id));

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
        </div>
        <div
          className="
            flex flex-wrap items-center gap-2 text-xs text-muted-foreground
          "
        >
          <Badge variant="secondary">{qs.layout === "grid" ? "Grid" : "List"}</Badge>
          {qs.page ? <Badge variant="outline">Page {qs.page}</Badge> : null}
          <LearningAreaBadges areas={qs.learningAreas} />
          <span>{slotCount} {slotCount === 1 ? "slot" : "slots"}</span>
          {qs.bookmarkTitle
            ? (
              <Badge
                variant="outline"
                className="
                  max-w-full min-w-0 shrink wrap-break-word whitespace-normal
                "
              >
                {qs.bookmarkId
                  ? (
                    <a
                      href={bookmarkAppUrl(bookmarksSettings?.endpointUrl, qs.bookmarkId)}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline"
                    >
                      {qs.bookmarkTitle}
                    </a>
                  )
                  : qs.bookmarkTitle}
              </Badge>
            )
            : null}
          {qs.dueDate
            ? met
              ? (
                <Badge
                  variant="outline"
                  className="border-green-600 text-green-600"
                >
                  <CalendarCheck />
                  Due date met ·
                  {" "}
                  {formatDueDate(qs.dueDate)}
                </Badge>
              )
              : (
                <Badge variant={isOverdue(qs.dueDate, new Date()) ? "destructive" : "outline"}>
                  Due {formatDueDate(qs.dueDate)}
                </Badge>
              )
            : null}
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

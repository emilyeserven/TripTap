import type { Writing } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";
import { LightbulbIcon, SparklesIcon } from "lucide-react";

import { TermCategoryBadges } from "@/components/TermCategoryBadges";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatWritingDate, writingLabel } from "@/lib/writing-label";

/**
 * One writing entry in the list — a compact, read-only summary that links to its own page. Editing
 * happens only on that page; the listing is view-only.
 *
 * The heading is the entry's name (its title, else the day it was written), never the body: a
 * paragraph of Japanese set as a heading made every card read as a slab of text.
 */
export function WritingCard({
  writing,
}: {
  writing: Writing;
}) {
  const correctionCount = writing.corrections?.length ?? 0;
  const excerpt = writing.text.trim();

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <Link
            to="/my-writing/$id"
            params={{
              id: writing.id,
            }}
            className="
              text-lg font-semibold
              hover:underline
            "
          >
            {writingLabel(writing)}
          </Link>
          {writing.title
            ? (
              <span className="text-xs text-muted-foreground">
                {formatWritingDate(writing.date)}
              </span>
            )
            : null}
        </div>

        {excerpt
          ? <p className="line-clamp-3 text-sm/relaxed whitespace-pre-wrap">{excerpt}</p>
          : <p className="text-sm text-muted-foreground italic">Nothing written yet.</p>}

        {writing.meaning
          ? (
            <div className="border-l-2 pl-3">
              <p
                className="
                  text-xs font-medium tracking-wide text-muted-foreground
                  uppercase
                "
              >
                Meant
              </p>
              <p className="text-sm text-muted-foreground">{writing.meaning}</p>
            </div>
          )
          : null}

        <div
          className="
            flex flex-wrap items-center gap-2 text-xs text-muted-foreground
          "
        >
          <Badge variant="secondary">{writing.language}</Badge>
          {writing.readyToReview ? <Badge variant="outline">Ready to review</Badge> : null}
          {correctionCount > 0
            ? (
              <Badge
                variant="outline"
                className="gap-1"
              >
                <SparklesIcon className="size-3" />
                {correctionCount}
                {" "}
                corrected
              </Badge>
            )
            : null}
          {writing.promptTitle
            ? (
              <Badge
                variant="outline"
                className="max-w-[16rem] gap-1"
              >
                <LightbulbIcon className="size-3 shrink-0" />
                <span className="truncate">{writing.promptTitle}</span>
              </Badge>
            )
            : null}
          <TermCategoryBadges terms={writing.terms} />
        </div>
      </CardContent>
    </Card>
  );
}

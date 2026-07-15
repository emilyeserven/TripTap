import type { Writing } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";
import { SparklesIcon } from "lucide-react";

import { groupTermsByCategory, TERM_CATEGORIES } from "../lib/terms";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

/**
 * One writing entry in the list — a compact, read-only summary that links to its own page. Editing
 * happens only on that page; the listing is view-only.
 */
export function WritingCard({
  writing,
}: {
  writing: Writing;
}) {
  const termGroups = groupTermsByCategory(writing.terms ?? []);
  const correctionCount = writing.corrections?.length ?? 0;

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <Link
            to="/my-writing/$id"
            params={{
              id: writing.id,
            }}
            className="
              line-clamp-3 text-lg font-semibold whitespace-pre-wrap
              hover:underline
            "
          >
            {writing.text || <span className="text-muted-foreground italic">Untitled writing</span>}
          </Link>
        </div>

        {writing.meaning ? <p className="text-sm text-muted-foreground">Meant: {writing.meaning}</p> : null}

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

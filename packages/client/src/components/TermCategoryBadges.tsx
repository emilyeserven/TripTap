import type { SentenceTermRef } from "@sentence-bank/types";

import { Badge } from "@/components/ui/badge";
import { groupTermsByCategory, TERM_CATEGORIES } from "@/lib/terms";

/**
 * The per-channel term badges shared by the My Sentence and Writing cards/views: one labelled group
 * per channel that has terms, each term as an outline badge titled with its source.
 */
export function TermCategoryBadges({
  terms,
}: {
  terms: SentenceTermRef[] | null;
}) {
  const termGroups = groupTermsByCategory(terms ?? []);
  return (
    <>
      {TERM_CATEGORIES.map(({
        category, label,
      }) => {
        const grouped = termGroups[category];
        if (grouped.length === 0) return null;
        return (
          <span
            key={category}
            className="inline-flex flex-wrap items-center gap-1"
          >
            <span>{label}:</span>
            {grouped.map(term => (
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
    </>
  );
}

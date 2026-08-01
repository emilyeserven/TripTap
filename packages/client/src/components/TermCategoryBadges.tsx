import type { SentenceTermCategory, SentenceTermRef } from "@sentence-bank/types";

import { GrammarTermBadges } from "@/components/GrammarTermBadges";
import { Badge } from "@/components/ui/badge";
import { groupTermsByCategory, TERM_CATEGORIES } from "@/lib/terms";

/**
 * The per-channel term badges shared by the My Sentence and Writing cards/views: one labelled group
 * per channel that has terms, each term as an outline badge titled with its source. Grammar tags are
 * rendered by {@link GrammarTermBadges} so they link to their Grammar note (or offer to create one).
 */
export function TermCategoryBadges({
  terms,
  omitCategories,
}: {
  terms: SentenceTermRef[] | null;
  /** Channels to leave out — for callers that render those themselves (e.g. an inline tag editor). */
  omitCategories?: SentenceTermCategory[];
}) {
  const termGroups = groupTermsByCategory(terms ?? []);
  return (
    <>
      {TERM_CATEGORIES.map(({
        category, label,
      }) => {
        const grouped = termGroups[category];
        if (grouped.length === 0 || omitCategories?.includes(category)) return null;
        // Grammar tags become links to their note (GrammarTermBadges supplies its own "Grammar:" label).
        if (category === "grammar") {
          return (
            <GrammarTermBadges
              key={category}
              terms={grouped}
            />
          );
        }
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

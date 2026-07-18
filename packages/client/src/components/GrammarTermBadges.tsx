import type { SentenceTermRef } from "@sentence-bank/types";

import { Badge } from "@/components/ui/badge";

/**
 * A question/answer sheet's grammar-point tags rendered as pills, prefixed with a "Grammar:" label.
 * Returns nothing when there are none, so it drops straight into an existing `flex flex-wrap gap-2`
 * badge row. Answer sheets pass the grammar tags they inherit from their parent question sheet.
 */
export function GrammarTermBadges({
  terms,
}: {
  terms: SentenceTermRef[];
}) {
  if (terms.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span className="shrink-0">Grammar:</span>
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
}

import type { SentenceTermRef } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { useGrammarNotes } from "@/hooks/useGrammarNotes";
import { notesByTagId } from "@/lib/grammar-notes";

/**
 * A question/answer sheet's grammar-point tags rendered as pills, prefixed with a "Grammar:" label.
 * Each pill links to the tag's Grammar note when one exists, otherwise to the new-note page
 * pre-filled with the tag (which redirects to the existing note if one is created).
 * Returns nothing when there are none, so it drops straight into an existing `flex flex-wrap gap-2`
 * badge row. Answer sheets pass the grammar tags they inherit from their parent question sheet.
 */
export function GrammarTermBadges({
  terms,
}: {
  terms: SentenceTermRef[];
}) {
  const {
    data: grammarNotes,
  } = useGrammarNotes();
  if (terms.length === 0) return null;
  const noteByTag = notesByTagId(grammarNotes ?? []);
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span className="shrink-0">Grammar:</span>
      {terms.map((term) => {
        const note = noteByTag.get(term.id);
        return (
          <Badge
            key={`${term.sourceId}:${term.id}`}
            asChild
            variant="outline"
            title={term.sourceLabel ? `${term.sourceLabel} (${term.kind})` : undefined}
          >
            {note
              ? (
                <Link
                  to="/grammar-notes/$id"
                  params={{
                    id: note.id,
                  }}
                >
                  {term.name}
                </Link>
              )
              : (
                <Link
                  to="/grammar-notes/new"
                  search={{
                    tag: term.id,
                    name: term.name,
                  }}
                >
                  {term.name}
                </Link>
              )}
          </Badge>
        );
      })}
    </span>
  );
}

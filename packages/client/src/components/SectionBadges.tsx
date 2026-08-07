import type { BookmarkSectionRef } from "@sentence-bank/types";

import { Badge } from "@/components/ui/badge";

/**
 * A question sheet's attached resource sections rendered as pills (prefixed "§"). Returns nothing when
 * there are none, so it drops straight into an existing `flex flex-wrap gap-2` badge row. Answer sheets
 * pass the sections they inherit from their parent question sheet, so an attempt shows which part of the
 * resource it covers.
 */
export function SectionBadges({
  sections,
}: {
  sections: BookmarkSectionRef[];
}) {
  if (sections.length === 0) return null;
  return (
    <>
      {sections.map(section => (
        <Badge
          key={section.id}
          variant="outline"
        >
          § {section.label}
        </Badge>
      ))}
    </>
  );
}

import type { LearningArea } from "@sentence-bank/types";

import { Badge } from "@/components/ui/badge";

/**
 * A question sheet's Learning Area tags rendered as pills. Returns nothing when there are none, so it
 * drops straight into an existing `flex flex-wrap gap-2` badge row. Answer sheets pass the areas they
 * inherit from their parent question sheet.
 */
export function LearningAreaBadges({
  areas,
}: {
  areas: LearningArea[];
}) {
  if (areas.length === 0) return null;
  return (
    <>
      {areas.map(area => (
        <Badge
          key={area}
          variant="outline"
        >
          {area}
        </Badge>
      ))}
    </>
  );
}

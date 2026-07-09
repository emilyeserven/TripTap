import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";

/** A reference to the lesson an item belongs to. */
export interface LessonRef {
  slug: string;
  title: string;
}

/** A small badge linking to the lesson an aggregated item came from. */
export function LessonBadge({
  slug, title,
}: LessonRef) {
  return (
    <Link
      to="/lessons/$slug"
      params={{
        slug,
      }}
      className="inline-flex"
    >
      <Badge
        variant="outline"
        className="hover:bg-accent"
      >{title}
      </Badge>
    </Link>
  );
}

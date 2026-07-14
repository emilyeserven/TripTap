import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";

/** A reference to the AI Lesson an item belongs to. */
export interface AiLessonRef {
  slug: string;
  title: string;
}

/** A small badge linking to the AI Lesson an aggregated item came from. */
export function AiLessonBadge({
  slug, title,
}: AiLessonRef) {
  return (
    <Link
      to="/ai-lessons/$slug"
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

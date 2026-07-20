import type { BookmarkResource, LearningAreaTagMap } from "@sentence-bank/types";

import { ExternalLink, ImageOff, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { resourceLearningAreas } from "@/lib/collections";

/**
 * A horizontally-scrolling "mixed row" of compact resource cards for the section hub pages. Each card
 * shows the bookmark's thumbnail, title (linking to the resource), favorite star, learning-area badges,
 * and progress bar — a curated shortcut into the full Resources page. Empty renders a muted note.
 */
export function ResourceRow({
  resources,
  areaTags,
  emptyText = "No resources yet.",
}: {
  resources: BookmarkResource[];
  areaTags: LearningAreaTagMap;
  emptyText?: string;
}) {
  if (resources.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {resources.map((r) => {
        const areas = resourceLearningAreas(r.tagIds, areaTags);
        return (
          <div
            key={r.id}
            className="
              flex w-56 shrink-0 flex-col overflow-hidden rounded-lg border
            "
          >
            {r.imageUrl
              ? (
                <img
                  src={r.imageUrl}
                  alt=""
                  loading="lazy"
                  className="w-full bg-muted"
                />
              )
              : (
                <div
                  className="
                    flex aspect-video w-full items-center justify-center
                    bg-muted
                  "
                >
                  <ImageOff className="size-6 text-muted-foreground" />
                </div>
              )}
            <div className="flex flex-1 flex-col gap-2 p-3">
              <div className="flex items-center gap-1">
                {r.favorite
                  ? (
                    <Star
                      className="
                        size-3.5 shrink-0 fill-yellow-400 text-yellow-400
                      "
                      aria-label="Favorited"
                    />
                  )
                  : null}
                {r.url
                  ? (
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="
                        flex min-w-0 items-center gap-1 text-sm font-medium
                        hover:underline
                      "
                    >
                      <span className="truncate">{r.title}</span>
                      <ExternalLink
                        className="size-3 shrink-0 text-muted-foreground"
                      />
                    </a>
                  )
                  : <span className="min-w-0 truncate text-sm font-medium">{r.title}</span>}
              </div>
              {areas.length > 0
                ? (
                  <div className="flex flex-wrap gap-1">
                    {areas.map(area => (
                      <Badge
                        key={area}
                        variant="secondary"
                        className="text-xs"
                      >
                        {area}
                      </Badge>
                    ))}
                  </div>
                )
                : null}
              {r.progress
                ? (
                  <div className="mt-auto space-y-1">
                    <Progress
                      value={Math.round(r.progress.percent * 100)}
                      className="h-1.5"
                    />
                    <p className="text-xs text-muted-foreground">{r.progress.label}</p>
                  </div>
                )
                : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

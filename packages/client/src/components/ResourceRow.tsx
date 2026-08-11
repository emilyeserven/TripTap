import type { BookmarkResource, LearningAreaTagMap } from "@sentence-bank/types";

import { ExternalLink, ImageOff } from "lucide-react";

import { AddToBasketButton } from "@/components/AddToBasketButton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { bookmarkAppUrl } from "@/lib/bookmarks";
import { resourceLearningAreas } from "@/lib/collections";

/** How many placeholder cards the loading row shows. */
const SKELETON_COUNT = 4;

/** A single placeholder card mirroring a resource card's shape (cover + title + badge + progress). */
function ResourceCardSkeleton() {
  return (
    <div
      className="flex w-56 shrink-0 flex-col overflow-hidden rounded-lg border"
    >
      <Skeleton className="aspect-video w-full rounded-none" />
      <div className="flex flex-1 flex-col gap-2 p-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="mt-auto h-1.5 w-full" />
      </div>
    </div>
  );
}

/**
 * A horizontally-scrolling "mixed row" of compact resource cards for the section hub pages. Each card
 * shows the bookmark's thumbnail, title (linking to the bookmark in the bookmarks app, not its external
 * URL), a basket toggle, learning-area badges, and progress bar — a curated shortcut into the full
 * Resources page. While `loading`, a row of placeholder cards shows (the bookmarks app is a remote
 * service, so the fetch is visibly slow); an empty result renders a muted note.
 */
export function ResourceRow({
  resources,
  areaTags,
  endpointUrl,
  loading = false,
  emptyText = "No resources yet.",
}: {
  resources: BookmarkResource[];
  areaTags: LearningAreaTagMap;
  /** The bookmarks-app base URL (Settings), used to link each card to its bookmark; falls back to the default. */
  endpointUrl?: string | null;
  /** Show placeholder cards instead of the empty note while the resources are still loading. */
  loading?: boolean;
  emptyText?: string;
}) {
  if (loading && resources.length === 0) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2">
        {Array.from({
          length: SKELETON_COUNT,
        }, (_, i) => <ResourceCardSkeleton key={i} />)}
      </div>
    );
  }
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
                <div className="w-full overflow-hidden bg-muted">
                  <img
                    src={r.imageUrl}
                    alt=""
                    loading="lazy"
                    className="h-auto w-full bg-muted"
                  />
                </div>
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
                <AddToBasketButton
                  item={{
                    kind: "resource",
                    id: r.id,
                    title: r.title,
                    imageUrl: r.imageUrl,
                  }}
                />
                <a
                  href={bookmarkAppUrl(endpointUrl, r.id)}
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

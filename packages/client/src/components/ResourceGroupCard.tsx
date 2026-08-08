import type { ReactNode } from "react";

import { ExternalLink, ImageOff } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useBookmarksSettings } from "@/hooks/useSettings";
import { bookmarkAppUrl } from "@/lib/bookmarks";

/** Placeholder shown when a resource has no cover image. `wide` matches the non-book aspect-video slot. */
function ImagePlaceholder({
  wide,
}: { wide?: boolean }) {
  return (
    <div
      className={`
        flex items-center justify-center rounded-sm border bg-muted
        ${wide ? "aspect-video w-full" : "aspect-3/4 w-16 shrink-0"}
      `}
    >
      <ImageOff className="size-4 text-muted-foreground" />
    </div>
  );
}

/**
 * The shared card shell for a single resource's grouped sheets: the resource's cover image (books on
 * the side, other media across the top), a header linking to the bookmark in the external app, then the
 * caller's content (`children`). The "no resource" group (`bookmarkId === null`) drops the image +
 * external link and shows a plain heading. Consumed by {@link QuestionSheetResourceGroup} and
 * {@link AnswerSheetResourceGroup} so both exercise tabs read the same.
 */
export function ResourceGroupCard({
  bookmarkId,
  bookmarkTitle,
  imageUrl,
  mediaType,
  children,
}: {
  bookmarkId: string | null;
  bookmarkTitle: string | null;
  imageUrl: string | null;
  mediaType: string | null;
  children: ReactNode;
}) {
  const {
    data: bookmarksSettings,
  } = useBookmarksSettings();
  const isBook = mediaType?.toLowerCase() === "book";

  const header = (
    <div className="min-w-0 flex-1 space-y-1">
      {bookmarkId
        ? (
          <a
            href={bookmarkAppUrl(bookmarksSettings?.endpointUrl, bookmarkId)}
            target="_blank"
            rel="noreferrer"
            className="
              flex items-center gap-1 font-semibold
              hover:underline
            "
          >
            <span className="truncate">{bookmarkTitle ?? "Untitled resource"}</span>
            <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
          </a>
        )
        : <p className="font-semibold text-muted-foreground">No resource</p>}
      {mediaType ? <Badge variant="outline">{mediaType}</Badge> : null}
    </div>
  );

  // Book: portrait cover on the left, content on the right. Non-book (and "no resource"): wide image
  // across the top, content below.
  if (isBook) {
    return (
      <li className="flex items-start gap-3 rounded-md border p-3">
        {imageUrl
          ? (
            <img
              src={imageUrl}
              alt=""
              loading="lazy"
              className="w-16 shrink-0 self-start rounded-sm border"
            />
          )
          : <ImagePlaceholder />}
        <div className="min-w-0 flex-1 space-y-2">
          {header}
          {children}
        </div>
      </li>
    );
  }

  return (
    <li className="space-y-2 rounded-md border p-3">
      {bookmarkId
        ? (imageUrl
          ? (
            <img
              src={imageUrl}
              alt=""
              loading="lazy"
              className="aspect-video w-full rounded-sm border object-cover"
            />
          )
          : <ImagePlaceholder wide />)
        : null}
      {header}
      {children}
    </li>
  );
}

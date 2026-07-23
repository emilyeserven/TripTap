import type { QuestionSheet } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";
import { ExternalLink, ImageOff, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

/** One section-link row: the sheet's section labels (title fallback), plus a muted page hint. */
function SheetLink({
  sheet,
}: { sheet: QuestionSheet }) {
  const label = sheet.sections.length > 0
    ? sheet.sections.map(s => s.label).join(", ")
    : sheet.title;
  return (
    <li className="text-sm">
      <Link
        to="/question-sheets/$id"
        params={{
          id: sheet.id,
        }}
        className="
          font-medium
          hover:underline
        "
      >
        › {label}
      </Link>
      {sheet.page
        ? <span className="text-muted-foreground">{" "}— {sheet.page}</span>
        : null}
    </li>
  );
}

/**
 * One resource's question sheets, rendered as a card: the resource's cover image (books on the side,
 * other media across the top), a header linking to the bookmark in the external app, and the sheets
 * as section links in the resource's reading order. The "no resource" group (`bookmarkId === null`)
 * drops the image + external link and shows a plain heading.
 */
export function QuestionSheetResourceGroup({
  bookmarkId,
  bookmarkTitle,
  bookmarkUrl,
  imageUrl,
  mediaType,
  sheets,
}: {
  bookmarkId: string | null;
  bookmarkTitle: string | null;
  bookmarkUrl: string | null;
  imageUrl: string | null;
  mediaType: string | null;
  sheets: QuestionSheet[];
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

  const sheetList = (
    <ul className="space-y-0.5">
      {sheets.map(s => (
        <SheetLink
          key={s.id}
          sheet={s}
        />
      ))}
    </ul>
  );

  // Pre-fills the new-sheet form with this resource. Only for real resources — the "no resource" group
  // is covered by the page-level "New question sheet" button.
  const newSheetButton = bookmarkId
    ? (
      <Button
        asChild
        variant="outline"
        size="sm"
      >
        <Link
          to="/question-sheets/new"
          search={{
            bookmarkId,
            ...(bookmarkTitle
              ? {
                bookmarkTitle,
              }
              : {}),
            ...(bookmarkUrl
              ? {
                bookmarkUrl,
              }
              : {}),
          }}
        >
          <Plus className="size-4" />
          New sheet
        </Link>
      </Button>
    )
    : null;

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
          {sheetList}
          {newSheetButton}
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
      {sheetList}
      {newSheetButton}
    </li>
  );
}

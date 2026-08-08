import type { QuestionSheet } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { ResourceGroupCard } from "@/components/ResourceGroupCard";
import { Button } from "@/components/ui/button";

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
 * One resource's question sheets, rendered on the shared {@link ResourceGroupCard}: the sheets as
 * section links in the resource's reading order, plus a "new sheet" shortcut pre-filled with the
 * resource. The "no resource" group (`bookmarkId === null`) drops the shortcut (the page-level "New
 * question sheet" button covers it).
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
  return (
    <ResourceGroupCard
      bookmarkId={bookmarkId}
      bookmarkTitle={bookmarkTitle}
      imageUrl={imageUrl}
      mediaType={mediaType}
    >
      <ul className="space-y-0.5">
        {sheets.map(s => (
          <SheetLink
            key={s.id}
            sheet={s}
          />
        ))}
      </ul>
      {/* Pre-fills the new-sheet form with this resource. Only for real resources — the "no resource"
          group is covered by the page-level "New question sheet" button. */}
      {bookmarkId
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
        : null}
    </ResourceGroupCard>
  );
}

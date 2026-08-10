import type { QuestionSheetProgress } from "@/lib/answer-sheets";
import type { QuestionSheet } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";
import { CircleCheck, CircleSlash, Plus } from "lucide-react";

import { ResourceGroupCard } from "@/components/ResourceGroupCard";
import { Button } from "@/components/ui/button";
import { sectionRangeLabel } from "@/lib/sections";

/**
 * The leading status marker for a sheet: a check-in-circle when finished, a slashed circle when in
 * progress, or the plain chevron when untouched — replacing the old bare "›". Fixed-width so the labels
 * stay aligned whichever marker shows.
 */
function StatusMarker({
  status,
}: { status: QuestionSheetProgress }) {
  if (status === "finished") {
    return (
      <CircleCheck
        className="size-4 shrink-0 text-emerald-600"
        aria-label="Finished"
      />
    );
  }
  if (status === "in-progress") {
    return (
      <CircleSlash
        className="size-4 shrink-0 text-amber-600"
        aria-label="In progress"
      />
    );
  }
  return (
    <span
      className="w-4 shrink-0 text-center text-muted-foreground"
      aria-hidden
    >
      ›
    </span>
  );
}

/** One section-link row: a progress marker, the sheet's section range (title fallback), and a page hint. */
function SheetLink({
  sheet,
  status,
}: { sheet: QuestionSheet;
  status: QuestionSheetProgress; }) {
  // The book is already the group heading, so show just the sections as a "first – last" range (with the
  // shared breadcrumb collapsed); fall back to the stored title when the sheet has no sections.
  const label = sectionRangeLabel(sheet.sections) ?? sheet.title;
  return (
    <li className="flex items-center gap-1.5 text-sm">
      <StatusMarker status={status} />
      <span className="min-w-0">
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
          {label}
        </Link>
        {sheet.page
          ? <span className="text-muted-foreground">{" "}— {sheet.page}</span>
          : null}
      </span>
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
  progressBySheetId,
}: {
  bookmarkId: string | null;
  bookmarkTitle: string | null;
  bookmarkUrl: string | null;
  imageUrl: string | null;
  mediaType: string | null;
  sheets: QuestionSheet[];
  /** Per-sheet progress (id → status) driving each row's marker; missing ids read as not-started. */
  progressBySheetId: Map<string, QuestionSheetProgress>;
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
            status={progressBySheetId.get(s.id) ?? "not-started"}
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

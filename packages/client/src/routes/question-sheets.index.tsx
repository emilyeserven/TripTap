import { useMemo, useState } from "react";

import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { QuestionSheetResourceGroup } from "@/components/QuestionSheetResourceGroup";
import { SheetFilters } from "@/components/SheetFilters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAllBookmarkSections, useBookmarkResources } from "@/hooks/useBookmarks";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useQuestionSheets } from "@/hooks/useQuestionSheets";
import {
  ALL_FILTER,
  matchesLearningArea,
  matchesResource,
  resourceFilterOptions,
} from "@/lib/answer-sheets";
import { buildTocIndex, groupSheetsByResource } from "@/lib/question-sheets";

export const Route = createFileRoute("/question-sheets/")({
  component: QuestionSheetsPage,
});

function QuestionSheetsPage() {
  usePageTitle("Question Sheets");
  const {
    data: sheets, isLoading, error,
  } = useQuestionSheets();
  const [search, setSearch] = useState("");
  const [resource, setResource] = useState(ALL_FILTER);
  const [area, setArea] = useState(ALL_FILTER);

  // Live resource metadata (current title, cover image, media type) keyed by bookmark id.
  const {
    data: resourceList,
  } = useBookmarkResources();
  const recordById = useMemo(
    () => new Map((resourceList?.resources ?? []).map(r => [r.id, r] as const)),
    [resourceList],
  );
  // Per-resource TOC order, so each group's sheets read in the book's reading order.
  const {
    data: allSections,
  } = useAllBookmarkSections();
  const tocIndex = useMemo(() => buildTocIndex(allSections ?? []), [allSections]);

  const resourceOptions = useMemo(() => resourceFilterOptions(sheets ?? []), [sheets]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (sheets ?? []).filter((s) => {
      if (q && !s.title.toLowerCase().includes(q) && !(s.notes ?? "").toLowerCase().includes(q)) {
        return false;
      }
      return matchesResource(s, resource) && matchesLearningArea(s, area);
    });
  }, [sheets, search, resource, area]);

  const groups = useMemo(() => groupSheetsByResource(shown, tocIndex), [shown, tocIndex]);

  const nothing = !isLoading && shown.length === 0;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            Reusable templates of textbook or worksheet questions. Build one, then answer it as many
            times as you like on the Answer Sheets page.
          </p>
        </div>
        <Button asChild>
          <Link to="/question-sheets/new">
            <Plus className="size-4" />
            New question sheet
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search question sheets…"
          aria-label="Search question sheets"
          className="max-w-sm"
        />
        <SheetFilters
          resource={resource}
          onResourceChange={setResource}
          resourceOptions={resourceOptions}
          area={area}
          onAreaChange={setArea}
        />
      </div>

      {error ? <p className="text-destructive">{error.message}</p> : null}
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
      {nothing
        ? (
          <p className="text-muted-foreground">
            No question sheets yet. Create one with “New question sheet”.
          </p>
        )
        : null}

      <ul
        className="
          grid gap-4
          sm:grid-cols-2
        "
      >
        {groups.map((group) => {
          const record = group.bookmarkId ? recordById.get(group.bookmarkId) : undefined;
          return (
            <QuestionSheetResourceGroup
              key={group.bookmarkId ?? "__none__"}
              bookmarkId={group.bookmarkId}
              bookmarkTitle={record?.title ?? group.sheets[0]?.bookmarkTitle ?? null}
              bookmarkUrl={record?.url ?? group.sheets[0]?.bookmarkUrl ?? null}
              imageUrl={record?.imageUrl ?? null}
              mediaType={record?.mediaType ?? null}
              sheets={group.sheets}
            />
          );
        })}
      </ul>
    </section>
  );
}

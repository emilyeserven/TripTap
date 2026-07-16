import { useMemo, useState } from "react";

import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { QuestionSheetCard } from "@/components/QuestionSheetCard";
import { SheetFilters } from "@/components/SheetFilters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useQuestionSheets } from "@/hooks/useQuestionSheets";
import {
  ALL_FILTER,
  matchesLearningArea,
  matchesResource,
  resourceFilterOptions,
} from "@/lib/answer-sheets";

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

      <div
        className="
          grid gap-4
          sm:grid-cols-2
        "
      >
        {shown.map(qs => (
          <QuestionSheetCard
            key={qs.id}
            questionSheet={qs}
          />
        ))}
      </div>
    </section>
  );
}

import { useMemo, useState } from "react";

import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { AnswerSheetCard } from "@/components/AnswerSheetCard";
import { SheetFilters } from "@/components/SheetFilters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAnswerSheets } from "@/hooks/useAnswerSheets";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useQuestionSheets } from "@/hooks/useQuestionSheets";
import {
  ALL_FILTER,
  matchesLearningArea,
  matchesResource,
  resourceFilterOptions,
} from "@/lib/answer-sheets";

export const Route = createFileRoute("/answer-sheets/")({
  component: AnswerSheetsPage,
});

function AnswerSheetsPage() {
  usePageTitle("Answer Sheets");
  const {
    data: sheets, isLoading, error,
  } = useAnswerSheets();
  const {
    data: questionSheets,
  } = useQuestionSheets();
  const [search, setSearch] = useState("");
  const [resource, setResource] = useState(ALL_FILTER);
  const [area, setArea] = useState(ALL_FILTER);

  const parentById = useMemo(
    () => new Map((questionSheets ?? []).map(q => [q.id, q])),
    [questionSheets],
  );
  // Resource options come from the question sheets that these attempts actually belong to.
  const resourceOptions = useMemo(() => {
    const parents = (sheets ?? [])
      .map(as => parentById.get(as.questionSheetId))
      .filter(q => q !== undefined);
    return resourceFilterOptions(parents);
  }, [sheets, parentById]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (sheets ?? []).filter((s) => {
      if (q && !(s.title ?? "").toLowerCase().includes(q)) return false;
      const parent = parentById.get(s.questionSheetId);
      return matchesResource(parent, resource) && matchesLearningArea(parent, area);
    });
  }, [sheets, search, resource, area, parentById]);

  const nothing = !isLoading && shown.length === 0;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            Your filled-in attempts at a question sheet. Open one to review it, or switch on the
            Corrections tab to record what went wrong and why.
          </p>
        </div>
        <Button asChild>
          <Link to="/answer-sheets/new">
            <Plus className="size-4" />
            New answer sheet
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search answer sheets…"
          aria-label="Search answer sheets"
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
            No answer sheets yet. Create one with “New answer sheet”, or answer a question sheet
            directly.
          </p>
        )
        : null}

      <div
        className="
          grid gap-4
          sm:grid-cols-2
        "
      >
        {shown.map(as => (
          <AnswerSheetCard
            key={as.id}
            answerSheet={as}
          />
        ))}
      </div>
    </section>
  );
}

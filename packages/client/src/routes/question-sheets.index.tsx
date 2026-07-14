import { useMemo, useState } from "react";

import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { QuestionSheetCard } from "@/components/QuestionSheetCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useDeleteQuestionSheet, useQuestionSheets } from "@/hooks/useQuestionSheets";

export const Route = createFileRoute("/question-sheets/")({
  component: QuestionSheetsPage,
});

function QuestionSheetsPage() {
  usePageTitle("Question Sheets");
  const {
    data: sheets, isLoading, error,
  } = useQuestionSheets();
  const deleteSheet = useDeleteQuestionSheet();
  const [search, setSearch] = useState("");

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (sheets ?? []).filter((s) => {
      if (!q) return true;
      return s.title.toLowerCase().includes(q) || (s.notes ?? "").toLowerCase().includes(q);
    });
  }, [sheets, search]);

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

      <Input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search question sheets…"
        aria-label="Search question sheets"
        className="max-w-sm"
      />

      {error ? <p className="text-destructive">{error.message}</p> : null}
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
      {nothing
        ? (
          <p className="text-muted-foreground">
            No question sheets yet. Create one with “New question sheet”.
          </p>
        )
        : null}

      <div className="space-y-4">
        {shown.map(qs => (
          <QuestionSheetCard
            key={qs.id}
            questionSheet={qs}
            onDelete={id => deleteSheet.mutate(id)}
          />
        ))}
      </div>
    </section>
  );
}

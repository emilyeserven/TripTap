import { useMemo, useState } from "react";

import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import { AnswerSheetCard } from "@/components/AnswerSheetCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAnswerSheets, useDeleteAnswerSheet } from "@/hooks/useAnswerSheets";

export const Route = createFileRoute("/answer-sheets/")({
  component: AnswerSheetsPage,
});

function AnswerSheetsPage() {
  const {
    data: sheets, isLoading, error,
  } = useAnswerSheets();
  const deleteSheet = useDeleteAnswerSheet();
  const [search, setSearch] = useState("");

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (sheets ?? []).filter((s) => {
      if (!q) return true;
      return (s.title ?? "").toLowerCase().includes(q);
    });
  }, [sheets, search]);

  const nothing = !isLoading && shown.length === 0;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Answer Sheets</h1>
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

      <Input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search answer sheets…"
        aria-label="Search answer sheets"
        className="max-w-sm"
      />

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

      <div className="space-y-4">
        {shown.map(as => (
          <AnswerSheetCard
            key={as.id}
            answerSheet={as}
            onDelete={id => deleteSheet.mutate(id)}
          />
        ))}
      </div>
    </section>
  );
}

import { useState } from "react";

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateAnswerSheet } from "@/hooks/useAnswerSheets";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useQuestionSheets } from "@/hooks/useQuestionSheets";

interface NewAnswerSheetSearch {
  questionSheetId?: string;
}

export const Route = createFileRoute("/answer-sheets/new")({
  validateSearch: (search: Record<string, unknown>): NewAnswerSheetSearch => ({
    questionSheetId:
      typeof search.questionSheetId === "string" ? search.questionSheetId : undefined,
  }),
  component: NewAnswerSheetPage,
});

/**
 * Minimal create step: an answer sheet is created immediately (so it gets an id) once a question sheet
 * is chosen, then the learner is dropped into the autosaving editor to fill in answers and corrections.
 */
function NewAnswerSheetPage() {
  usePageTitle("New answer sheet");
  const navigate = useNavigate();
  const {
    questionSheetId: initial,
  } = Route.useSearch();
  const sheets = useQuestionSheets();
  const create = useCreateAnswerSheet();

  const [questionSheetId, setQuestionSheetId] = useState(initial ?? "");
  const [title, setTitle] = useState("");

  const selected = (sheets.data ?? []).find(s => s.id === questionSheetId);

  const submit = async () => {
    if (!questionSheetId || create.isPending) return;
    const derivedTitle = title.trim()
      || `${selected?.title ?? "Answer sheet"} — ${new Date().toLocaleDateString()}`;
    const saved = await create.mutateAsync({
      questionSheetId,
      title: derivedTitle,
      entries: [],
    });
    navigate({
      to: "/answer-sheets/$id/edit",
      params: {
        id: saved.id,
      },
    });
  };

  return (
    <section className="max-w-3xl space-y-6">
      <Button
        asChild
        variant="ghost"
        size="sm"
      >
        <Link to="/answer-sheets">
          <ArrowLeft className="size-4" />
          All answer sheets
        </Link>
      </Button>
      <div>
        <p className="text-sm text-muted-foreground">
          Pick a question sheet to start — you’ll fill in your answers and corrections next, and it all
          saves automatically.
        </p>
      </div>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="space-y-1.5">
          <Label>Question sheet</Label>
          <Combobox
            value={questionSheetId}
            onChange={setQuestionSheetId}
            options={(sheets.data ?? []).map(s => ({
              value: s.id,
              label: s.title,
            }))}
            ariaLabel="Question sheet"
            placeholder={sheets.isLoading ? "Loading…" : "Choose a question sheet…"}
            className="w-full max-w-md"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-as-title">Title (optional)</Label>
          <Input
            id="new-as-title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={selected ? `${selected.title} — today` : "Defaults to the sheet name + date"}
            className="max-w-md"
          />
        </div>
        <Button
          type="submit"
          disabled={!questionSheetId || create.isPending}
        >
          {create.isPending ? "Creating…" : "Create answer sheet"}
        </Button>
      </form>
    </section>
  );
}

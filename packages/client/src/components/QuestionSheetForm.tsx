import type {
  LearningArea,
  QuestionSheet,
  QuestionSheetGridRow,
  QuestionSheetLayout,
  QuestionSheetQuestion,
} from "@sentence-bank/types";

import { useEffect, useState } from "react";

import { BookmarkPicker } from "@/components/BookmarkPicker";
import { LearningAreaMultiSelect } from "@/components/LearningAreaMultiSelect";
import { QuestionGridEditor } from "@/components/QuestionGridEditor";
import { QuestionListEditor } from "@/components/QuestionListEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useCreateQuestionSheet, useUpdateQuestionSheet } from "@/hooks/useQuestionSheets";

/**
 * Create/edit form for a Question Sheet — the reusable template of textbook/worksheet questions.
 * Collects the source bookmark, page, an auto-filled title, notes, an optional due date, and either
 * a dynamic list of questions (each with optional labelled parts) or a grid (named columns + labelled
 * rows). Passing `questionSheet` puts it in edit mode; otherwise it creates a new one.
 */
export function QuestionSheetForm({
  questionSheet,
  onSuccess,
}: {
  questionSheet?: QuestionSheet;
  onSuccess?: (id: string) => void;
}) {
  const create = useCreateQuestionSheet();
  const update = useUpdateQuestionSheet();
  const editing = questionSheet !== undefined;

  const [bookmarkId, setBookmarkId] = useState(questionSheet?.bookmarkId ?? null);
  const [bookmarkTitle, setBookmarkTitle] = useState(questionSheet?.bookmarkTitle ?? null);
  const [bookmarkUrl, setBookmarkUrl] = useState(questionSheet?.bookmarkUrl ?? null);
  const [page, setPage] = useState(questionSheet?.page ?? "");
  const [dueDate, setDueDate] = useState(questionSheet?.dueDate?.slice(0, 10) ?? "");
  const [title, setTitle] = useState(questionSheet?.title ?? "");
  // In edit mode the existing title is never auto-overwritten; in create mode it tracks the
  // bookmark/page until the user types into it directly.
  const [titleTouched, setTitleTouched] = useState(editing);
  const [notes, setNotes] = useState(questionSheet?.notes ?? "");
  const [learningAreas, setLearningAreas] = useState<LearningArea[]>(
    questionSheet?.learningAreas ?? [],
  );
  const [layout, setLayout] = useState<QuestionSheetLayout>(questionSheet?.layout ?? "list");
  const [questions, setQuestions] = useState<QuestionSheetQuestion[]>(
    questionSheet?.questions ?? [],
  );
  const [columns, setColumns] = useState<string[]>(questionSheet?.grid?.columns ?? [""]);
  const [rows, setRows] = useState<QuestionSheetGridRow[]>(questionSheet?.grid?.rows ?? []);

  useEffect(() => {
    if (titleTouched) return;
    const derived = [bookmarkTitle, page.trim() || null].filter(Boolean).join(" — ");
    if (derived) setTitle(derived);
  }, [bookmarkTitle, page, titleTouched]);

  const pending = create.isPending || update.isPending;
  const canSubmit = title.trim().length > 0 && !pending;

  const submit = async () => {
    if (!canSubmit) return;
    const cleanColumns = columns.map(c => c.trim()).filter(c => c.length > 0);
    const input = {
      title: title.trim(),
      layout,
      notes: notes.trim() || null,
      page: page.trim() || null,
      bookmarkId,
      bookmarkTitle,
      bookmarkUrl,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      learningAreas,
      questions: layout === "list" ? questions : [],
      grid: layout === "grid"
        ? {
          columns: cleanColumns,
          rows,
        }
        : null,
    };
    const saved = editing
      ? await update.mutateAsync({
        id: questionSheet.id,
        input,
      })
      : await create.mutateAsync(input);
    onSuccess?.(saved.id);
  };

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div
        className="
          grid gap-4
          sm:grid-cols-[1fr_auto_auto]
        "
      >
        <BookmarkPicker
          category="resource"
          label="Resources"
          selectedBookmarkId={bookmarkId}
          selectedBookmarkTitle={bookmarkTitle}
          onPick={(record) => {
            setBookmarkId(record?.id ?? null);
            setBookmarkTitle(record?.title ?? null);
            setBookmarkUrl(record?.url ?? null);
          }}
        />
        <div className="space-y-1.5">
          <Label htmlFor="qs-page">Page</Label>
          <Input
            id="qs-page"
            value={page}
            onChange={e => setPage(e.target.value)}
            placeholder="p. 12–13"
            className="sm:w-32"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="qs-due-date">Due date</Label>
          <Input
            id="qs-due-date"
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="sm:w-40"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="qs-title">Title</Label>
        <Input
          id="qs-title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setTitleTouched(true);
          }}
          placeholder="Genki I — Lesson 3 workbook"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="qs-notes">Notes</Label>
        <Textarea
          id="qs-notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Anything to remember about this exercise set (optional)"
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>Learning areas</Label>
        <LearningAreaMultiSelect
          value={learningAreas}
          onChange={setLearningAreas}
        />
        <p className="text-xs text-muted-foreground">
          Tag the skills this sheet practises (optional). Answer sheets inherit these.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Layout</Label>
        <Tabs
          value={layout}
          onValueChange={v => setLayout(v as QuestionSheetLayout)}
        >
          <TabsList>
            <TabsTrigger value="list">List of questions</TabsTrigger>
            <TabsTrigger value="grid">Grid / table</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {layout === "list"
        ? (
          <QuestionListEditor
            questions={questions}
            onChange={setQuestions}
          />
        )
        : (
          <QuestionGridEditor
            columns={columns}
            rows={rows}
            onColumnsChange={setColumns}
            onRowsChange={setRows}
          />
        )}

      <div className="flex items-center gap-2">
        <Button
          type="submit"
          disabled={!canSubmit}
        >
          {pending
            ? "Saving…"
            : editing
              ? "Save changes"
              : "Create question sheet"}
        </Button>
      </div>
    </form>
  );
}

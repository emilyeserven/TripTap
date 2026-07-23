import type {
  BookmarkSectionRef,
  LearningArea,
  QuestionSheet,
  QuestionSheetGridRow,
  QuestionSheetLayout,
  QuestionSheetQuestion,
  SentenceTermRef,
} from "@sentence-bank/types";

import { useEffect, useMemo, useState } from "react";

import { Plus, X } from "lucide-react";

import { BookmarkPicker } from "@/components/BookmarkPicker";
import { BookmarkSectionSelect } from "@/components/BookmarkSectionSelect";
import { LearningAreaMultiSelect } from "@/components/LearningAreaMultiSelect";
import { QuestionGridEditor } from "@/components/QuestionGridEditor";
import { QuestionListEditor } from "@/components/QuestionListEditor";
import { TermPicker } from "@/components/TermPicker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useBookmarkRecord } from "@/hooks/useBookmarks";
import {
  useCreateQuestionSheet,
  useQuestionSheets,
  useUpdateQuestionSheet,
} from "@/hooks/useQuestionSheets";
import { resolveSectionPage } from "@/lib/sections";

/**
 * Create/edit form for a Question Sheet — the reusable template of textbook/worksheet questions.
 * Collects the source bookmark, page, an auto-filled title, notes, an optional due date, and either
 * a dynamic list of questions (each with optional labelled parts) or a grid (named columns + labelled
 * rows). Passing `questionSheet` puts it in edit mode; otherwise it creates a new one.
 */
export function QuestionSheetForm({
  questionSheet,
  initialResource,
  onSuccess,
}: {
  questionSheet?: QuestionSheet;
  /** Pre-fills the resource on a new sheet (e.g. "New sheet" from a resource block). Ignored in edit mode. */
  initialResource?: { bookmarkId: string | null;
    bookmarkTitle: string | null;
    bookmarkUrl: string | null; };
  onSuccess?: (id: string) => void;
}) {
  const create = useCreateQuestionSheet();
  const update = useUpdateQuestionSheet();
  const editing = questionSheet !== undefined;

  const [bookmarkId, setBookmarkId] = useState(
    questionSheet?.bookmarkId ?? initialResource?.bookmarkId ?? null,
  );
  const [bookmarkTitle, setBookmarkTitle] = useState(
    questionSheet?.bookmarkTitle ?? initialResource?.bookmarkTitle ?? null,
  );
  const [bookmarkUrl, setBookmarkUrl] = useState(
    questionSheet?.bookmarkUrl ?? initialResource?.bookmarkUrl ?? null,
  );
  const [sections, setSections] = useState<BookmarkSectionRef[]>(questionSheet?.sections ?? []);
  // The candidate section in the cascading picker; committed to `sections` via "Add section".
  const [pendingSection, setPendingSection] = useState<BookmarkSectionRef | null>(null);
  const [page, setPage] = useState(questionSheet?.page ?? "");
  // Like the title: in edit mode the saved page is left alone; in create mode a picked page-section
  // fills it until the user types their own page.
  const [pageTouched, setPageTouched] = useState(editing);
  const [dueDate, setDueDate] = useState(questionSheet?.dueDate?.slice(0, 10) ?? "");
  const [title, setTitle] = useState(questionSheet?.title ?? "");
  // In edit mode the existing title is never auto-overwritten; in create mode it tracks the
  // bookmark/page until the user types into it directly.
  const [titleTouched, setTitleTouched] = useState(editing);
  const [notes, setNotes] = useState(questionSheet?.notes ?? "");
  const [firstQuestionNumber, setFirstQuestionNumber] = useState(
    String(questionSheet?.firstQuestionNumber ?? 1),
  );
  const [learningAreas, setLearningAreas] = useState<LearningArea[]>(
    questionSheet?.learningAreas ?? [],
  );
  const [grammarTerms, setGrammarTerms] = useState<SentenceTermRef[]>(
    questionSheet?.grammarTerms ?? [],
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

  // The picked bookmark's full Sections tree (shared cache with the picker); used to resolve a section's
  // page, walking up to a paged parent when the section itself has none.
  const sectionTree = useBookmarkRecord(bookmarkId).data?.sectionTree ?? [];

  // Sections of the picked resource that already have a question sheet (excluding this one when editing)
  // plus the ones already attached here — so the section picker dims them and gaps are easy to spot.
  const allSheets = useQuestionSheets().data;
  const usedSectionIds = useMemo(() => {
    if (!bookmarkId) return undefined;
    const fromOthers = (allSheets ?? [])
      .filter(s => s.bookmarkId === bookmarkId && s.id !== questionSheet?.id)
      .flatMap(s => s.sections.map(sec => sec.id));
    return new Set([...fromOthers, ...sections.map(s => s.id)]);
  }, [allSheets, bookmarkId, questionSheet?.id, sections]);

  // Commit the candidate section: add it (deduped) and pre-fill the page from it unless the user typed one.
  const addPendingSection = () => {
    if (!pendingSection || sections.some(s => s.id === pendingSection.id)) return;
    setSections([...sections, pendingSection]);
    const derivedPage = resolveSectionPage(sectionTree, pendingSection.id);
    if (derivedPage && !pageTouched) setPage(derivedPage);
    setPendingSection(null);
  };
  const removeSection = (id: string) => setSections(sections.filter(s => s.id !== id));

  // The effective first-question number (≥ 1), shared by the submit payload and the editor labels.
  const firstNumber = Math.max(1, Math.floor(Number(firstQuestionNumber)) || 1);

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
      sections,
      firstQuestionNumber: firstNumber,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      learningAreas,
      grammarTerms,
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
            onChange={(e) => {
              setPage(e.target.value);
              setPageTouched(true);
            }}
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

      {bookmarkId && sectionTree.length > 0
        ? (
          <div className="space-y-2">
            <Label>Sections</Label>
            <div className="flex flex-wrap items-end gap-2">
              <BookmarkSectionSelect
                nodes={sectionTree}
                value={pendingSection?.id ?? ""}
                onChange={setPendingSection}
                usedSectionIds={usedSectionIds}
                className="w-full max-w-sm"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={addPendingSection}
                disabled={!pendingSection}
              >
                <Plus className="size-4" />
                Add section
              </Button>
            </div>
            {sections.length > 0
              ? (
                <ul className="flex flex-wrap gap-2">
                  {sections.map(s => (
                    <li key={s.id}>
                      <Badge
                        variant="secondary"
                        className="gap-1"
                      >
                        {s.label}
                        <button
                          type="button"
                          aria-label={`Remove ${s.label}`}
                          onClick={() => removeSection(s.id)}
                          className="hover:text-destructive"
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    </li>
                  ))}
                </ul>
              )
              : null}
            <p className="text-xs text-muted-foreground">
              Attach one or more sections of this resource (optional). Sections that already have a
              sheet are dimmed.
            </p>
          </div>
        )
        : null}

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
          Tag the skills this sheet practises (optional). Answer sheets inherit these, and XP from
          answering is split evenly across the areas you pick.
        </p>
      </div>

      <TermPicker
        category="grammar"
        label="Grammar tags"
        value={grammarTerms}
        onChange={setGrammarTerms}
      />

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
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="qs-first-number">First question number</Label>
              <Input
                id="qs-first-number"
                type="number"
                min={1}
                value={firstQuestionNumber}
                onChange={e => setFirstQuestionNumber(e.target.value)}
                className="w-24"
              />
              <p className="text-xs text-muted-foreground">
                If this section starts partway through a worksheet (e.g. Question 8), set the starting
                number — the slots number up from there.
              </p>
            </div>
            <QuestionListEditor
              questions={questions}
              onChange={setQuestions}
              firstNumber={firstNumber}
            />
          </div>
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

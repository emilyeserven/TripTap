import type {
  QuestionSheet,
  QuestionSheetGridRow,
  QuestionSheetLayout,
  QuestionSheetQuestion,
  SentenceTermRef,
} from "@sentence-bank/types";

import { useState } from "react";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";

import { TermPicker } from "@/components/TermPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useCreateQuestionSheet, useUpdateQuestionSheet } from "@/hooks/useQuestionSheets";

/** Client-side unique id for questions/parts/rows (unique within one sheet is enough). */
let idCounter = 0;
function newId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`;
}

/**
 * Create/edit form for a Question Sheet — the reusable template of textbook/worksheet questions.
 * Collects a title, notes, a Textbooks & Worksheets tag, and either a dynamic list of questions
 * (each with optional labelled parts) or a grid (named columns + labelled rows). Passing
 * `questionSheet` puts it in edit mode; otherwise it creates a new one.
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

  const [title, setTitle] = useState(questionSheet?.title ?? "");
  const [notes, setNotes] = useState(questionSheet?.notes ?? "");
  const [layout, setLayout] = useState<QuestionSheetLayout>(questionSheet?.layout ?? "list");
  const [resourceTerms, setResourceTerms] = useState<SentenceTermRef[]>(
    questionSheet?.resourceTerms ?? [],
  );
  const [questions, setQuestions] = useState<QuestionSheetQuestion[]>(
    questionSheet?.questions ?? [],
  );
  const [columns, setColumns] = useState<string[]>(questionSheet?.grid?.columns ?? [""]);
  const [rows, setRows] = useState<QuestionSheetGridRow[]>(questionSheet?.grid?.rows ?? []);

  const pending = create.isPending || update.isPending;
  const canSubmit = title.trim().length > 0 && !pending;

  // ── Question (list) editors ────────────────────────────────────────────────
  function addQuestion() {
    setQuestions(qs => [...qs, {
      id: newId("q"),
      prompt: "",
    }]);
  }
  function updateQuestion(id: string, patch: Partial<QuestionSheetQuestion>) {
    setQuestions(qs => qs.map(q => (q.id === id
      ? {
        ...q,
        ...patch,
      }
      : q)));
  }
  function removeQuestion(id: string) {
    setQuestions(qs => qs.filter(q => q.id !== id));
  }
  function moveQuestion(index: number, delta: number) {
    setQuestions((qs) => {
      const next = [...qs];
      const target = index + delta;
      if (target < 0 || target >= next.length) return qs;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }
  function addPart(questionId: string) {
    setQuestions(qs => qs.map(q =>
      (q.id === questionId
        ? {
          ...q,
          parts: [...(q.parts ?? []), {
            id: newId("p"),
            label: "",
          }],
        }
        : q)));
  }
  function updatePart(questionId: string, partId: string, label: string) {
    setQuestions(qs => qs.map(q =>
      (q.id === questionId
        ? {
          ...q,
          parts: (q.parts ?? []).map(p => (p.id === partId
            ? {
              ...p,
              label,
            }
            : p)),
        }
        : q)));
  }
  function removePart(questionId: string, partId: string) {
    setQuestions(qs => qs.map(q =>
      (q.id === questionId
        ? {
          ...q,
          parts: (q.parts ?? []).filter(p => p.id !== partId),
        }
        : q)));
  }

  // ── Grid editors ───────────────────────────────────────────────────────────
  function addColumn() {
    setColumns(c => [...c, ""]);
  }
  function updateColumn(index: number, value: string) {
    setColumns(c => c.map((col, i) => (i === index ? value : col)));
  }
  function removeColumn(index: number) {
    setColumns(c => c.filter((_, i) => i !== index));
  }
  function addRow() {
    setRows(r => [...r, {
      id: newId("r"),
      label: "",
    }]);
  }
  function updateRow(id: string, label: string) {
    setRows(r => r.map(row => (row.id === id
      ? {
        ...row,
        label,
      }
      : row)));
  }
  function removeRow(id: string) {
    setRows(r => r.filter(row => row.id !== id));
  }

  const submit = async () => {
    if (!canSubmit) return;
    const cleanColumns = columns.map(c => c.trim()).filter(c => c.length > 0);
    const input = {
      title: title.trim(),
      layout,
      notes: notes.trim() || null,
      resourceTerms: resourceTerms.length > 0 ? resourceTerms : null,
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
      <div className="space-y-1.5">
        <Label htmlFor="qs-title">Title</Label>
        <Input
          id="qs-title"
          value={title}
          onChange={e => setTitle(e.target.value)}
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

      <TermPicker
        category="resource"
        label="Textbook / Worksheet"
        value={resourceTerms}
        onChange={setResourceTerms}
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
            {questions.map((q, index) => (
              <div
                key={q.id}
                className="space-y-3 rounded-md border p-4"
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor={`q-${q.id}`}>Question {index + 1}</Label>
                    <Textarea
                      id={`q-${q.id}`}
                      value={q.prompt}
                      onChange={e => updateQuestion(q.id, {
                        prompt: e.target.value,
                      })}
                      placeholder="Write the question or prompt…"
                      rows={2}
                    />
                  </div>
                  <div className="flex flex-col gap-1 pt-6">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Move question up"
                      disabled={index === 0}
                      onClick={() => moveQuestion(index, -1)}
                    >
                      <ChevronUp className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Move question down"
                      disabled={index === questions.length - 1}
                      onClick={() => moveQuestion(index, 1)}
                    >
                      <ChevronDown className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      aria-label="Remove question"
                      onClick={() => removeQuestion(q.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>

                {(q.parts ?? []).length > 0
                  ? (
                    <div className="space-y-2 pl-4">
                      {(q.parts ?? []).map(part => (
                        <div
                          key={part.id}
                          className="flex items-center gap-2"
                        >
                          <Input
                            value={part.label}
                            onChange={e => updatePart(q.id, part.id, e.target.value)}
                            placeholder="Part label, e.g. (a)"
                            aria-label="Part label"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            aria-label="Remove part"
                            onClick={() => removePart(q.id, part.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )
                  : null}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addPart(q.id)}
                >
                  <Plus className="size-4" />
                  Add part
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={addQuestion}
            >
              <Plus className="size-4" />
              Add question
            </Button>
          </div>
        )
        : (
          <div
            className="
              grid gap-6
              sm:grid-cols-2
            "
          >
            <div className="space-y-2">
              <Label>Columns</Label>
              {columns.map((col, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2"
                >
                  <Input
                    value={col}
                    onChange={e => updateColumn(index, e.target.value)}
                    placeholder={`Column ${index + 1}, e.g. ます-form`}
                    aria-label={`Column ${index + 1}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    aria-label="Remove column"
                    onClick={() => removeColumn(index)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addColumn}
              >
                <Plus className="size-4" />
                Add column
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Rows</Label>
              {rows.map((row, index) => (
                <div
                  key={row.id}
                  className="flex items-center gap-2"
                >
                  <Input
                    value={row.label}
                    onChange={e => updateRow(row.id, e.target.value)}
                    placeholder={`Row ${index + 1}, e.g. 食べる`}
                    aria-label={`Row ${index + 1}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    aria-label="Remove row"
                    onClick={() => removeRow(row.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRow}
              >
                <Plus className="size-4" />
                Add row
              </Button>
            </div>
          </div>
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

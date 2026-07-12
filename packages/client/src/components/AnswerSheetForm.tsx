import type {
  AnswerSheet,
  AnswerSheetEntry,
  QuestionSheet,
} from "@sentence-bank/types";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useCreateAnswerSheet, useUpdateAnswerSheet } from "@/hooks/useAnswerSheets";
import { useQuestionSheets } from "@/hooks/useQuestionSheets";
import { questionSheetSlots } from "@/lib/answer-sheets";

/** A blank entry for a slot the user has not filled in yet. */
function emptyEntry(slotId: string): AnswerSheetEntry {
  return {
    slotId,
    value: "",
    needsCorrection: false,
    correction: null,
    reasoning: null,
    intendedMeaning: null,
    actualMeaning: null,
  };
}

/** True once the user has put anything into a slot (an answer, a correction, or the flag). */
function isTouched(e: AnswerSheetEntry): boolean {
  return e.value.trim().length > 0
    || e.needsCorrection
    || Boolean(e.correction?.trim())
    || Boolean(e.reasoning?.trim())
    || Boolean(e.intendedMeaning?.trim())
    || Boolean(e.actualMeaning?.trim());
}

/**
 * Create/edit form for an Answer Sheet — one filled-in attempt at a Question Sheet. On create you
 * pick the question sheet (or arrive with one pre-selected); then one input is rendered per slot. The
 * "Corrections" tab exposes per-slot correction / reasoning / intended / actual fields plus a
 * needs-correction flag, mirroring the My Sentences correction UX. Only touched slots are saved.
 */
export function AnswerSheetForm({
  answerSheet,
  initialQuestionSheetId,
  onSuccess,
}: {
  answerSheet?: AnswerSheet;
  initialQuestionSheetId?: string;
  onSuccess?: (id: string) => void;
}) {
  const create = useCreateAnswerSheet();
  const update = useUpdateAnswerSheet();
  const editing = answerSheet !== undefined;
  const sheets = useQuestionSheets();

  const [questionSheetId, setQuestionSheetId] = useState(
    answerSheet?.questionSheetId ?? initialQuestionSheetId ?? "",
  );
  const [title, setTitle] = useState(answerSheet?.title ?? "");
  const [entries, setEntries] = useState<Record<string, AnswerSheetEntry>>(() => {
    const seed: Record<string, AnswerSheetEntry> = {};
    for (const e of answerSheet?.entries ?? []) seed[e.slotId] = e;
    return seed;
  });

  const selected: QuestionSheet | undefined = (sheets.data ?? []).find(s => s.id === questionSheetId);
  const slots = selected ? questionSheetSlots(selected) : [];

  const pending = create.isPending || update.isPending;
  const canSubmit = questionSheetId.length > 0 && !pending;

  function getEntry(slotId: string): AnswerSheetEntry {
    return entries[slotId] ?? emptyEntry(slotId);
  }
  function setField<K extends keyof AnswerSheetEntry>(
    slotId: string,
    field: K,
    value: AnswerSheetEntry[K],
  ) {
    setEntries(prev => ({
      ...prev,
      [slotId]: {
        ...getEntry(slotId),
        [field]: value,
      },
    }));
  }

  const submit = async () => {
    if (!canSubmit) return;
    const touched = slots
      .map(slot => getEntry(slot.id))
      .filter(isTouched)
      .map(e => ({
        ...e,
        correction: e.correction?.trim() || null,
        reasoning: e.reasoning?.trim() || null,
        intendedMeaning: e.intendedMeaning?.trim() || null,
        actualMeaning: e.actualMeaning?.trim() || null,
      }));
    const derivedTitle = title.trim()
      || `${selected?.title ?? "Answer sheet"} — ${new Date().toLocaleDateString()}`;
    const input = {
      questionSheetId,
      title: derivedTitle,
      entries: touched,
    };
    const saved = editing
      ? await update.mutateAsync({
        id: answerSheet.id,
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
        <Label>Question sheet</Label>
        {editing
          ? (
            <p className="text-sm text-muted-foreground">
              {selected?.title ?? "Loading…"}
            </p>
          )
          : (
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
          )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="as-title">Title</Label>
        <Input
          id="as-title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder={selected ? `${selected.title} — today` : "Defaults to the sheet name + date"}
        />
      </div>

      {selected
        ? (
          <Tabs defaultValue="answers">
            <TabsList>
              <TabsTrigger value="answers">Answers</TabsTrigger>
              <TabsTrigger value="corrections">Corrections</TabsTrigger>
            </TabsList>

            <TabsContent
              value="answers"
              className="space-y-4 pt-4"
            >
              {selected.layout === "grid" && selected.grid
                ? (
                  <GridAnswers
                    grid={selected.grid}
                    getEntry={getEntry}
                    setField={setField}
                  />
                )
                : (
                  <div className="space-y-4">
                    {slots.map(slot => (
                      <div
                        key={slot.id}
                        className="space-y-1.5"
                      >
                        <Label htmlFor={`ans-${slot.id}`}>{slot.label}</Label>
                        <Textarea
                          id={`ans-${slot.id}`}
                          value={getEntry(slot.id).value}
                          onChange={e => setField(slot.id, "value", e.target.value)}
                          rows={2}
                        />
                      </div>
                    ))}
                    {slots.length === 0
                      ? <p className="text-sm text-muted-foreground">This sheet has no questions yet.</p>
                      : null}
                  </div>
                )}
            </TabsContent>

            <TabsContent
              value="corrections"
              className="space-y-4 pt-4"
            >
              {slots.map((slot) => {
                const entry = getEntry(slot.id);
                return (
                  <div
                    key={slot.id}
                    className="space-y-3 rounded-md border p-4"
                  >
                    <div>
                      <p className="text-sm font-medium">{slot.label}</p>
                      <p className="text-sm text-muted-foreground">
                        {entry.value.trim() || <span className="italic">No answer yet</span>}
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={entry.needsCorrection}
                        onCheckedChange={v => setField(slot.id, "needsCorrection", v === true)}
                      />
                      Needs correction
                    </label>
                    <div className="space-y-1.5">
                      <Label htmlFor={`corr-${slot.id}`}>Correction</Label>
                      <Textarea
                        id={`corr-${slot.id}`}
                        value={entry.correction ?? ""}
                        onChange={e => setField(slot.id, "correction", e.target.value)}
                        placeholder="The corrected answer"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`reason-${slot.id}`}>Explanation</Label>
                      <Textarea
                        id={`reason-${slot.id}`}
                        value={entry.reasoning ?? ""}
                        onChange={e => setField(slot.id, "reasoning", e.target.value)}
                        placeholder="Why it was wrong"
                        rows={2}
                      />
                    </div>
                    <div
                      className="
                        grid gap-4
                        sm:grid-cols-2
                      "
                    >
                      <div className="space-y-1.5">
                        <Label htmlFor={`intended-${slot.id}`}>Intended meaning</Label>
                        <Textarea
                          id={`intended-${slot.id}`}
                          value={entry.intendedMeaning ?? ""}
                          onChange={e => setField(slot.id, "intendedMeaning", e.target.value)}
                          placeholder="What you meant to say"
                          rows={2}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`actual-${slot.id}`}>What it actually says</Label>
                        <Textarea
                          id={`actual-${slot.id}`}
                          value={entry.actualMeaning ?? ""}
                          onChange={e => setField(slot.id, "actualMeaning", e.target.value)}
                          placeholder="The literal reading of your answer, if different"
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </TabsContent>
          </Tabs>
        )
        : <p className="text-sm text-muted-foreground">Pick a question sheet to start answering.</p>}

      <div className="flex items-center gap-2">
        <Button
          type="submit"
          disabled={!canSubmit}
        >
          {pending
            ? "Saving…"
            : editing
              ? "Save changes"
              : "Create answer sheet"}
        </Button>
      </div>
    </form>
  );
}

/** The grid layout's answers, rendered as a labelled table of inputs (one per row × column). */
function GridAnswers({
  grid,
  getEntry,
  setField,
}: {
  grid: NonNullable<QuestionSheet["grid"]>;
  getEntry: (slotId: string) => AnswerSheetEntry;
  setField: (slotId: string, field: "value", value: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border p-2 text-left font-medium" />
            {grid.columns.map((col, i) => (
              <th
                key={i}
                className="border p-2 text-left font-medium"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grid.rows.map(row => (
            <tr key={row.id}>
              <th className="border p-2 text-left font-medium">{row.label}</th>
              {grid.columns.map((col, colIndex) => {
                const slotId = `${row.id}:${colIndex}`;
                return (
                  <td
                    key={colIndex}
                    className="border p-1"
                  >
                    <Input
                      value={getEntry(slotId).value}
                      onChange={e => setField(slotId, "value", e.target.value)}
                      aria-label={`${row.label} ${col}`}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import type {
  AnswerSheet,
  BookmarkRecord,
  BookmarkSectionRef,
  QuestionSheet,
  ScheduledTask,
  ScheduledTaskTarget,
} from "@sentence-bank/types";

import { useState } from "react";

import { ChevronDown, Plus } from "lucide-react";

import { BookmarkPicker } from "@/components/BookmarkPicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { questionSheetParts } from "@/lib/answer-sheets";
import { tomorrowDateString } from "@/lib/daily-lineup";
import { newId } from "@/lib/id";

type Kind = "resource" | "answer-sheet";
const WHOLE_SHEET = "__whole__";

/**
 * A collapsible card for scheduling a one-off task: pick a day (default tomorrow) and a target — a
 * resource+section (via {@link BookmarkPicker}) or an answer sheet, optionally focused on one part
 * (a top-level question). Owns no persistence; the built task is handed to the parent.
 */
export function AddScheduledTaskCard({
  answerSheets,
  questionSheets,
  onAdd,
}: {
  answerSheets: AnswerSheet[];
  questionSheets: QuestionSheet[];
  onAdd: (task: ScheduledTask) => void;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(() => tomorrowDateString(new Date()));
  const [kind, setKind] = useState<Kind>("resource");

  // Resource target
  const [resource, setResource] = useState<BookmarkRecord | null>(null);
  const [section, setSection] = useState<BookmarkSectionRef | null>(null);

  // Answer-sheet target
  const [answerSheetId, setAnswerSheetId] = useState<string>("");
  const [partId, setPartId] = useState<string>(WHOLE_SHEET);

  const selectedSheet = answerSheets.find(a => a.id === answerSheetId) ?? null;
  const selectedQuestionSheet = selectedSheet
    ? questionSheets.find(q => q.id === selectedSheet.questionSheetId) ?? null
    : null;
  const parts = selectedQuestionSheet ? questionSheetParts(selectedQuestionSheet) : [];

  function sheetLabel(sheet: AnswerSheet): string {
    const questionSheet = questionSheets.find(q => q.id === sheet.questionSheetId);
    return sheet.title?.trim() || questionSheet?.title || "Untitled answer sheet";
  }

  const canAdd = date.length > 0
    && (kind === "resource" ? Boolean(resource) : Boolean(answerSheetId));

  function reset() {
    setResource(null);
    setSection(null);
    setAnswerSheetId("");
    setPartId(WHOLE_SHEET);
  }

  function add() {
    if (!canAdd) return;
    let target: ScheduledTaskTarget;
    if (kind === "resource") {
      if (!resource) return;
      target = {
        kind: "resource",
        resourceId: resource.id,
        resourceTitle: resource.title,
        section,
      };
    }
    else {
      if (!selectedSheet) return;
      target = {
        kind: "answer-sheet",
        answerSheetId: selectedSheet.id,
        title: sheetLabel(selectedSheet),
        partId: partId === WHOLE_SHEET ? null : partId,
      };
    }
    onAdd({
      id: `sched-${newId()}`,
      date,
      label: null,
      target,
      done: false,
    });
    reset();
    setOpen(false);
  }

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      asChild
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="size-4" />
            Schedule a task
          </CardTitle>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-label={open ? "Hide the task scheduler" : "Schedule a task"}
            >
              <ChevronDown
                className={`
                  size-4 transition-transform
                  ${open ? "rotate-180" : ""}
                `}
              />
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="scheduled-task-date">Day</Label>
                <Input
                  id="scheduled-task-date"
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-44"
                />
              </div>
              <div className="flex gap-2">
                {(["resource", "answer-sheet"] as const).map(k => (
                  <Button
                    key={k}
                    type="button"
                    size="sm"
                    variant={kind === k ? "default" : "outline"}
                    onClick={() => setKind(k)}
                  >
                    {k === "resource" ? "Resource" : "Answer sheet"}
                  </Button>
                ))}
              </div>
            </div>

            {kind === "resource"
              ? (
                <BookmarkPicker
                  category="resource"
                  label="Resource"
                  selectedBookmarkId={resource?.id ?? null}
                  selectedBookmarkTitle={resource?.title ?? null}
                  onPick={(record) => {
                    setResource(record);
                    setSection(null);
                  }}
                  enableSections
                  selectedSection={section}
                  onPickSection={setSection}
                />
              )
              : (
                <div
                  className="
                    grid gap-3
                    sm:grid-cols-2
                  "
                >
                  <div className="space-y-1.5">
                    <Label>Answer sheet</Label>
                    <Select
                      value={answerSheetId}
                      onValueChange={(v) => {
                        setAnswerSheetId(v);
                        setPartId(WHOLE_SHEET);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pick an answer sheet" />
                      </SelectTrigger>
                      <SelectContent>
                        {answerSheets.map(sheet => (
                          <SelectItem
                            key={sheet.id}
                            value={sheet.id}
                          >
                            {sheetLabel(sheet)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {parts.length > 0
                    ? (
                      <div className="space-y-1.5">
                        <Label>Part</Label>
                        <Select
                          value={partId}
                          onValueChange={setPartId}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={WHOLE_SHEET}>Whole sheet</SelectItem>
                            {parts.map((part, i) => (
                              <SelectItem
                                key={part.id}
                                value={part.id}
                              >
                                Part {i + 1} — {part.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )
                    : null}
                </div>
              )}

            <Button
              type="button"
              onClick={add}
              disabled={!canAdd}
            >
              Add task
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

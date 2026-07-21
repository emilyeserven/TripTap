import type {
  TheoryDensity,
  TheoryEntryMode,
  TheorySession,
  XpRates,
} from "@sentence-bank/types";

import { useState } from "react";

import { DEFAULT_XP_RATES } from "@sentence-bank/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useXpSettings } from "@/hooks/useSettings";
import {
  useCreateTheorySession,
  useUpdateTheorySession,
} from "@/hooks/useTheorySessions";
import { todayDateString } from "@/lib/daily-lineup";
import { formatXp } from "@/lib/xp";

const DENSITIES: { value: TheoryDensity;
  label: string; }[] = [
  {
    value: "dense",
    label: "Dense",
  },
  {
    value: "medium",
    label: "Medium",
  },
  {
    value: "light",
    label: "Light",
  },
];

/** Round `x` up to the nearest 0.25 — mirrors the server's `ceilToQuarter` for the live preview. */
function ceilToQuarter(x: number): number {
  return Math.ceil(x * 4) / 4;
}

/** The XP a theory entry would earn, mirroring the server's `theoryStudyXp`. */
function previewXp(
  args: {
    entryMode: TheoryEntryMode;
    pages: number;
    density: TheoryDensity;
    wordCount: number;
    notesCount: number;
  },
  rates: XpRates,
): number {
  const pageRate = args.density === "dense"
    ? rates.theoryStudyPageDense
    : args.density === "light"
      ? rates.theoryStudyPageLight
      : rates.theoryStudyPageMedium;
  const base = args.entryMode === "pages"
    ? args.pages * pageRate
    : ceilToQuarter((args.wordCount / 250) * rates.theoryStudyPer250Words);
  const xp = base + args.notesCount * rates.theoryStudyNote;
  return Math.round(xp * 100) / 100;
}

/**
 * Create/edit form for a theory-study session. One component powers both the new and edit pages —
 * pass a `session` to edit an existing one. The entry mode toggles between counting XP by pages (with
 * a density multiplier) or by a self-reported word count; either way, self-reported notes add a little
 * XP each. A live preview shows the XP the entry would earn under the current rates.
 */
export function TheorySessionForm({
  session,
  onSuccess,
}: {
  session?: TheorySession;
  onSuccess?: (id: string) => void;
}) {
  const create = useCreateTheorySession();
  const update = useUpdateTheorySession();
  const xpSettings = useXpSettings();
  const editing = session !== undefined;

  const [date, setDate] = useState(session?.date ?? todayDateString(new Date()));
  const [title, setTitle] = useState(session?.title ?? "");
  const [entryMode, setEntryMode] = useState<TheoryEntryMode>(session?.entryMode ?? "pages");
  const [pages, setPages] = useState(String(session?.pages ?? 0));
  const [density, setDensity] = useState<TheoryDensity>(session?.density ?? "medium");
  const [wordCount, setWordCount] = useState(String(session?.wordCount ?? 0));
  const [notesCount, setNotesCount] = useState(String(session?.notesCount ?? 0));
  const [notes, setNotes] = useState(session?.notes ?? "");

  const pending = create.isPending || update.isPending;
  const canSubmit = date.trim().length > 0 && !pending;

  const rates = xpSettings.data?.rates ?? DEFAULT_XP_RATES;
  const pagesNum = Math.max(0, Math.trunc(Number(pages) || 0));
  const wordCountNum = Math.max(0, Math.trunc(Number(wordCount) || 0));
  const notesCountNum = Math.max(0, Math.trunc(Number(notesCount) || 0));
  const xpPreview = previewXp(
    {
      entryMode,
      pages: pagesNum,
      density,
      wordCount: wordCountNum,
      notesCount: notesCountNum,
    },
    rates,
  );

  const submit = async () => {
    if (!canSubmit) return;
    const input = {
      date,
      title: title.trim() || null,
      entryMode,
      // Keep only the active mode's fields; clear the other so XP never double-counts.
      pages: entryMode === "pages" ? pagesNum : null,
      density: entryMode === "pages" ? density : null,
      wordCount: entryMode === "words" ? wordCountNum : null,
      notesCount: notesCountNum,
      notes: notes.trim() || null,
    };
    const saved = editing
      ? await update.mutateAsync({
        id: session.id,
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
          sm:grid-cols-2
        "
      >
        <div className="space-y-1.5">
          <Label htmlFor="theory-date">Date</Label>
          <Input
            id="theory-date"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="theory-title">Title (optional)</Label>
          <Input
            id="theory-title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Genki II ch. 12 — causative"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>How to count this</Label>
        <p className="text-xs text-muted-foreground">
          Earn Grammar XP by pages studied (weighted by how dense they are) or by a word count.
        </p>
        <Tabs
          value={entryMode}
          onValueChange={v => setEntryMode(v as TheoryEntryMode)}
        >
          <TabsList>
            <TabsTrigger value="pages">By pages</TabsTrigger>
            <TabsTrigger value="words">By words</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {entryMode === "pages"
        ? (
          <div
            className="
              grid gap-4
              sm:grid-cols-2
            "
          >
            <div className="space-y-1.5">
              <Label htmlFor="theory-pages">Pages</Label>
              <Input
                id="theory-pages"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={pages}
                onChange={e => setPages(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="theory-density">Density</Label>
              <Select
                value={density}
                onValueChange={v => setDensity(v as TheoryDensity)}
              >
                <SelectTrigger
                  id="theory-density"
                  className="w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DENSITIES.map(d => (
                    <SelectItem
                      key={d.value}
                      value={d.value}
                    >
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )
        : (
          <div
            className="
              space-y-1.5
              sm:max-w-xs
            "
          >
            <Label htmlFor="theory-words">Word count</Label>
            <Input
              id="theory-words"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={wordCount}
              onChange={e => setWordCount(e.target.value)}
            />
          </div>
        )}

      <div
        className="
          space-y-1.5
          sm:max-w-xs
        "
      >
        <Label htmlFor="theory-notes-count">Notes taken</Label>
        <p className="text-xs text-muted-foreground">
          How many notes you jotted down. Earns {formatXp(rates.theoryStudyNote)} XP each.
        </p>
        <Input
          id="theory-notes-count"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={notesCount}
          onChange={e => setNotesCount(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="theory-notes">Notes (optional)</Label>
        <Textarea
          id="theory-notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="What you learned, questions, things to revisit."
          rows={3}
        />
      </div>

      <p className="text-sm text-muted-foreground">
        This entry earns
        {" "}
        <span className="font-medium text-foreground tabular-nums">{formatXp(xpPreview)} XP</span>
        {" "}
        toward Grammar.
      </p>

      <div className="flex items-center gap-2">
        <Button
          type="submit"
          disabled={!canSubmit}
        >
          {pending
            ? "Saving…"
            : editing
              ? "Save changes"
              : "Create session"}
        </Button>
      </div>
    </form>
  );
}

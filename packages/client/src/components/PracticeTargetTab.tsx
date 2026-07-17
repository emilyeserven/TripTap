import type { PracticeDraft, SetPracticeDraft } from "@/lib/practiceEditor";
import type { PracticeTargetKind } from "@sentence-bank/types";
import type { ReactNode } from "react";

import { Plus, TriangleAlert, X } from "lucide-react";

import { PracticeField } from "./PracticeField";

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
import { emptyGrammar, TARGET_KINDS } from "@/lib/practiceEditor";

/** Step — Identify the Target: the one thing the sentence teaches, plus its grammar points. */
export function PracticeTargetTab({
  draft,
  set,
  footer,
}: {
  draft: PracticeDraft;
  set: SetPracticeDraft;
  footer: ReactNode;
}) {
  const unknowns = draft.words.filter(w => w.w.trim()).length;

  const setGram = (i: number, key: "p" | "n", value: string) =>
    set("grammar", draft.grammar.map((g, j) => (j === i
      ? {
        ...g,
        [key]: value,
      }
      : g)));

  return (
    <>
      <div>
        <Label className="text-sm">The one target</Label>
        <p className="text-xs text-muted-foreground">the single thing this sentence is teaching you</p>
      </div>
      <div
        className="
          grid gap-3
          sm:grid-cols-2
        "
      >
        <Input
          value={draft.target}
          onChange={e => set("target", e.target.value)}
          placeholder="頭が痛い"
        />
        <Select
          value={draft.targetKind}
          onValueChange={v => set("targetKind", v as PracticeTargetKind)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TARGET_KINDS.map(t => (
              <SelectItem
                key={t.value}
                value={t.value}
              >
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {unknowns > 2
        ? (
          <p className="flex items-center gap-1.5 text-xs text-destructive">
            <TriangleAlert className="size-3.5 shrink-0" />
            {unknowns}
            {" "}
            unknown words logged. Past two, this sentence is likely too hard to be a good card —
            study it, but consider not mining it.
          </p>
        )
        : null}
      <PracticeField
        label="Grammar"
        hint="pattern, then what it does to the meaning"
      >
        <div className="space-y-2">
          {draft.grammar.map((g, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_2fr_auto] gap-2"
            >
              <Input
                value={g.p}
                onChange={e => setGram(i, "p", e.target.value)}
                placeholder="〜も〜ないし"
              />
              <Input
                value={g.n}
                onChange={e => setGram(i, "n", e.target.value)}
                placeholder="stacks another complaint; し leaves the list open"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remove grammar point"
                onClick={() => set("grammar", draft.grammar.filter((_, j) => j !== i))}
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => set("grammar", [...draft.grammar, emptyGrammar()])}
          >
            <Plus className="size-4" />
            Add grammar point
          </Button>
        </div>
      </PracticeField>
      {footer}
    </>
  );
}

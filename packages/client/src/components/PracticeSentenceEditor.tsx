import type { PracticeDraft } from "@/lib/practiceEditor";
import type { PracticeSentence } from "@sentence-bank/types";

import { useEffect, useRef, useState } from "react";

import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";

import { PracticeAnalyzeTab } from "./PracticeAnalyzeTab";
import { PracticeCategorizeTab } from "./PracticeCategorizeTab";
import { PracticeField } from "./PracticeField";
import { PracticeOutput } from "./PracticeOutput";
import { PracticeReadTab } from "./PracticeReadTab";
import { PracticeTargetTab } from "./PracticeTargetTab";
import { useUpdatePracticeSentence } from "../hooks/usePracticeSentences";
import { useSentences } from "../hooks/useSentences";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { NONE, toDraft, toInput } from "@/lib/practiceEditor";

/** The guided steps, in order. The index drives the number prefix shown on each tab. */
const TABS = [
  {
    value: "read",
    label: "Read Aloud",
  },
  {
    value: "guess",
    label: "Guess",
  },
  {
    value: "analyze",
    label: "Translation",
  },
  {
    value: "target",
    label: "Target",
  },
  {
    value: "categorize",
    label: "Categorize",
  },
  {
    value: "output",
    label: "Output",
  },
] as const;

type TabValue = (typeof TABS)[number]["value"];
const TAB_VALUES = TABS.map(t => t.value) as TabValue[];

/**
 * Guided, tabbed editor for one practice sentence. There is no Save button: field changes are debounced
 * and PATCHed automatically (a "Saving…/Saved" header indicator), across every tab. The six tabs walk
 * the study arc — read aloud, guess, target, analyze, categorize, output.
 */
export function PracticeSentenceEditor({
  practiceSentence,
}: {
  practiceSentence: PracticeSentence;
}) {
  const update = useUpdatePracticeSentence();
  const [draft, setDraft] = useState<PracticeDraft>(() => toDraft(practiceSentence));
  const [status, setStatus] = useState("");
  const dirty = useRef(false);

  // The origin bank sentence (if this was created from the bank), for "fill from bank" translation.
  const {
    data: bankSentences,
  } = useSentences();
  const origin = practiceSentence.sentenceId
    ? bankSentences?.find(s => s.id === practiceSentence.sentenceId)
    : undefined;

  useEffect(() => {
    if (!dirty.current) return;
    setStatus("Saving…");
    const timer = setTimeout(() => {
      update.mutate(
        {
          id: practiceSentence.id,
          input: toInput(draft),
        },
        {
          onSuccess: () => {
            setStatus("Saved");
            window.setTimeout(() => setStatus(cur => (cur === "Saved" ? "" : cur)), 1400);
          },
          onError: () => setStatus("Not saved — check your connection"),
        },
      );
    }, 700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, practiceSentence.id]);

  const set = <K extends keyof PracticeDraft>(key: K, value: PracticeDraft[K]) => {
    dirty.current = true;
    setDraft(d => ({
      ...d,
      [key]: value,
    }));
  };

  const [tab, setTab] = useState<TabValue>("read");
  const [recallRevealed, setRecallRevealed] = useState(false);
  // Each step unlocks its Next button once its key field(s) are filled. Genuinely-optional fields
  // (reading, literal, nuance, page, source) don't gate progress.
  const complete: Record<TabValue, boolean> = {
    read: draft.text.trim() !== "" && draft.language.trim() !== "",
    guess: draft.guess.trim() !== "",
    target: draft.target.trim() !== "",
    analyze: draft.translation.trim() !== "",
    categorize: draft.register !== NONE,
    output: true,
  };
  const goNextFrom = (value: TabValue) => {
    const i = TAB_VALUES.indexOf(value);
    if (i < TAB_VALUES.length - 1) setTab(TAB_VALUES[i + 1]);
  };
  const stepFooter = (value: TabValue) =>
    (value === TAB_VALUES[TAB_VALUES.length - 1]
      ? (
        <div className="flex justify-end pt-2">
          <Button
            asChild
            variant="outline"
          >
            <Link
              to="/practice/$id"
              params={{
                id: practiceSentence.id,
              }}
            >Finish
            </Link>
          </Button>
        </div>
      )
      : (
        <div className="flex justify-end pt-2">
          <Button
            disabled={!complete[value]}
            onClick={() => goNextFrom(value)}
          >
            Next
            <ArrowRight className="size-4" />
          </Button>
        </div>
      ));

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <Button
          asChild
          variant="ghost"
          size="sm"
        >
          <Link to="/practice">
            <ArrowLeft className="size-4" />
            All practice sentences
          </Link>
        </Button>
        <div className="flex items-center gap-4">
          <label
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <Checkbox
              checked={draft.needsCorrection}
              onCheckedChange={checked => set("needsCorrection", checked === true)}
            />
            Needs correction
          </label>
          <span
            className="flex items-center gap-1.5 text-sm text-muted-foreground"
            aria-live="polite"
          >
            {status === "Saved" ? <Check className="size-4 text-primary" /> : null}
            {status}
          </span>
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={v => setTab(v as TabValue)}
      >
        <TabsList className="flex-wrap">
          {TABS.map((t, i) => (
            <TabsTrigger
              key={t.value}
              value={t.value}
            >
              <span className="mr-1.5 text-xs opacity-60">{i + 1}</span>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent
          value="read"
          className="space-y-5 pt-2"
        >
          <PracticeReadTab
            draft={draft}
            set={set}
            practiceSentence={practiceSentence}
            footer={stepFooter("read")}
          />
        </TabsContent>

        <TabsContent
          value="guess"
          className="pt-2"
        >
          <PracticeField
            label="Guess the meaning"
            hint="commit to a meaning before you check"
          >
            <Textarea
              value={draft.guess}
              onChange={e => set("guess", e.target.value)}
              placeholder="Something about not being able to rest and a headache?"
              rows={3}
            />
          </PracticeField>
          {stepFooter("guess")}
        </TabsContent>

        <TabsContent
          value="target"
          className="space-y-3 pt-2"
        >
          <PracticeTargetTab
            draft={draft}
            set={set}
            footer={stepFooter("target")}
          />
        </TabsContent>

        <TabsContent
          value="analyze"
          className="space-y-5 pt-2"
        >
          <PracticeAnalyzeTab
            draft={draft}
            set={set}
            originTranslation={origin?.translation ?? null}
            recallRevealed={recallRevealed}
            onReveal={() => setRecallRevealed(true)}
            footer={stepFooter("analyze")}
          />
        </TabsContent>

        <TabsContent
          value="categorize"
          className="space-y-5 pt-2"
        >
          <PracticeCategorizeTab
            draft={draft}
            set={set}
            footer={stepFooter("categorize")}
          />
        </TabsContent>

        <TabsContent
          value="output"
          className="pt-2"
        >
          <PracticeOutput practiceSentence={practiceSentence} />
          {stepFooter("output")}
        </TabsContent>
      </Tabs>
    </section>
  );
}

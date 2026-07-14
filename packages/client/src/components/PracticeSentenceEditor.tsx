import type {
  CreatePracticeSentenceInput,
  PracticeComprehension,
  PracticeGrammar,
  PracticeSentence,
  PracticeTargetKind,
  PracticeWord,
  SentenceTermCategory,
  SentenceTermRef,
} from "@sentence-bank/types";
import type { ReactNode } from "react";

import { useEffect, useRef, useState } from "react";

import { Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Plus, TriangleAlert, Volume2, X } from "lucide-react";

import { speak } from "./ai-lesson/speak";
import { PracticeOutput } from "./PracticeOutput";
import { PracticeReadAloudVocab } from "./PracticeReadAloudVocab";
import { SourcePicker } from "./SourcePicker";
import { TermPicker } from "./TermPicker";
import { useUpdatePracticeSentence } from "../hooks/usePracticeSentences";
import { useSentences } from "../hooks/useSentences";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const NONE = "—";

/** Politeness/register options; `NONE` maps to a null register. */
const REGISTERS = [
  NONE,
  "casual (タメ口)",
  "polite (です・ます)",
  "humble (謙譲)",
  "honorific (尊敬)",
  "written / formal",
  "slang",
] as const;

/** Target kinds, paired with their display labels. */
const TARGET_KINDS: { value: PracticeTargetKind;
  label: string; }[] = [
  {
    value: "word",
    label: "word",
  },
  {
    value: "grammar",
    label: "grammar point",
  },
  {
    value: "idiom",
    label: "idiom / set phrase",
  },
  {
    value: "collocation",
    label: "collocation",
  },
  {
    value: "reading",
    label: "reading / kanji",
  },
];

const emptyWord = (): PracticeWord => ({
  w: "",
  r: "",
  m: "",
});
const emptyGrammar = (): PracticeGrammar => ({
  p: "",
  n: "",
});

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

/** Comprehension buckets (Tofugu's curation gate), with their guidance. */
const COMPREHENSION_OPTIONS: { value: PracticeComprehension;
  label: string;
  hint: string; }[] = [
  {
    value: "ready",
    label: "Ready to card",
    hint: "I get 80%+",
  },
  {
    value: "studying",
    label: "Study the parts",
    hint: "under 80%",
  },
  {
    value: "skip",
    label: "Skip for now",
    hint: "under 50%",
  },
];

/** Speak Japanese slowly, for shadowing / pitch-accent practice. Best-effort. */
function speakSlow(text: string) {
  try {
    if (globalThis.speechSynthesis && text) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ja-JP";
      u.rate = 0.55;
      globalThis.speechSynthesis.cancel();
      globalThis.speechSynthesis.speak(u);
    }
  }
  catch {
    // ignore — TTS is best-effort
  }
}

/** The editable draft: the practice sentence's own fields (vocab + output live in child components). */
interface Draft {
  text: string;
  language: string;
  reading: string;
  translation: string;
  target: string;
  targetKind: PracticeTargetKind;
  comprehension: PracticeComprehension | null;
  guess: string;
  literal: string;
  register: string;
  nuance: string;
  page: string;
  words: PracticeWord[];
  grammar: PracticeGrammar[];
  terms: SentenceTermRef[];
  sourceId: string | null;
  needsCorrection: boolean;
}

function toDraft(ps: PracticeSentence): Draft {
  return {
    text: ps.text,
    language: ps.language,
    reading: ps.reading ?? "",
    translation: ps.translation ?? "",
    target: ps.target ?? "",
    targetKind: ps.targetKind ?? "word",
    comprehension: ps.comprehension,
    guess: ps.guess ?? "",
    literal: ps.literal ?? "",
    register: ps.register ?? NONE,
    nuance: ps.nuance ?? "",
    page: ps.page ?? "",
    words: ps.words?.length ? ps.words : [emptyWord()],
    grammar: ps.grammar?.length ? ps.grammar : [emptyGrammar()],
    terms: ps.terms ?? [],
    sourceId: ps.sourceId,
    needsCorrection: ps.needsCorrection,
  };
}

/** Build the API input from the draft, dropping empty rows. */
function toInput(draft: Draft): CreatePracticeSentenceInput {
  const cleanWords = draft.words.filter(w => w.w.trim() || w.r.trim() || w.m.trim());
  const cleanGrammar = draft.grammar.filter(g => g.p.trim() || g.n.trim());
  return {
    text: draft.text,
    language: draft.language,
    reading: draft.reading || null,
    translation: draft.translation || null,
    target: draft.target || null,
    targetKind: draft.target ? draft.targetKind : null,
    comprehension: draft.comprehension,
    guess: draft.guess || null,
    literal: draft.literal || null,
    register: draft.register === NONE ? null : draft.register,
    nuance: draft.nuance || null,
    words: cleanWords.length > 0 ? cleanWords : null,
    grammar: cleanGrammar.length > 0 ? cleanGrammar : null,
    terms: draft.terms.length > 0 ? draft.terms : null,
    sourceId: draft.sourceId,
    page: draft.page || null,
    needsCorrection: draft.needsCorrection,
  };
}

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
  const [draft, setDraft] = useState<Draft>(() => toDraft(practiceSentence));
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

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    dirty.current = true;
    setDraft(d => ({
      ...d,
      [key]: value,
    }));
  };

  const setGram = (i: number, key: keyof PracticeGrammar, value: string) =>
    set("grammar", draft.grammar.map((g, j) => (j === i
      ? {
        ...g,
        [key]: value,
      }
      : g)));

  const termsFor = (cat: SentenceTermCategory) =>
    draft.terms.filter(t => (t.category ?? "vocabulary") === cat);
  const setTermsFor = (cat: SentenceTermCategory, next: SentenceTermRef[]) =>
    set("terms", [...draft.terms.filter(t => (t.category ?? "vocabulary") !== cat), ...next]);

  const unknowns = draft.words.filter(w => w.w.trim()).length;

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

  const grammarField = (
    <Field
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
    </Field>
  );

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

        {/* 1 — Read Aloud */}
        <TabsContent
          value="read"
          className="space-y-5 pt-2"
        >
          <div className="flex items-start gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="size-8 shrink-0"
              aria-label="Hear it"
              onClick={() => speak(draft.text)}
            >
              <Volume2 className="size-5" />
            </Button>
            <p className="text-2xl font-semibold">{draft.text || "—"}</p>
          </div>
          <div
            className="
              flex flex-wrap items-center gap-2 text-xs text-muted-foreground
            "
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => speakSlow(draft.text)}
            >
              <Volume2 className="size-3.5" />
              Play slowly
            </Button>
            Shadow it — say it back, matching the pitch accent and rhythm.
          </div>
          <Field
            label="The sentence"
            hint="copy it exactly; trim it if it's long"
          >
            <Textarea
              value={draft.text}
              onChange={e => set("text", e.target.value)}
              rows={2}
            />
          </Field>
          <div
            className="
              grid gap-4
              sm:grid-cols-2
            "
          >
            <Field
              label="Reading"
              hint="only the parts you weren't sure of"
            >
              <Input
                value={draft.reading}
                onChange={e => set("reading", e.target.value)}
                placeholder="あたまがいたい"
              />
            </Field>
            <Field label="Language">
              <Input
                value={draft.language}
                onChange={e => set("language", e.target.value)}
                placeholder="Japanese"
              />
            </Field>
          </div>
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-baseline gap-2">
              <Label className="text-sm">How much do you understand?</Label>
              <span className="text-xs text-muted-foreground/80">
                card it now, study the parts first, or skip
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {COMPREHENSION_OPTIONS.map(o => (
                <Button
                  key={o.value}
                  type="button"
                  size="sm"
                  variant={draft.comprehension === o.value ? "default" : "outline"}
                  onClick={() =>
                    set("comprehension", draft.comprehension === o.value ? null : o.value)}
                >
                  {o.label}
                  <span className="ml-1 text-xs opacity-70">{o.hint}</span>
                </Button>
              ))}
            </div>
          </div>
          <PracticeReadAloudVocab practiceSentence={practiceSentence} />
          {stepFooter("read")}
        </TabsContent>

        {/* 2 — Guess the Meaning */}
        <TabsContent
          value="guess"
          className="pt-2"
        >
          <Field
            label="Guess the meaning"
            hint="commit to a meaning before you check"
          >
            <Textarea
              value={draft.guess}
              onChange={e => set("guess", e.target.value)}
              placeholder="Something about not being able to rest and a headache?"
              rows={3}
            />
          </Field>
          {stepFooter("guess")}
        </TabsContent>

        {/* 4 — Identify the Target */}
        <TabsContent
          value="target"
          className="space-y-3 pt-2"
        >
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
          {grammarField}
          {stepFooter("target")}
        </TabsContent>

        {/* 3 — Analyze the Translation */}
        <TabsContent
          value="analyze"
          className="space-y-5 pt-2"
        >
          <div className="space-y-2 rounded-md border p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Label className="text-sm">Recall drill (E→J)</Label>
              <span className="text-xs text-muted-foreground/80">say the Japanese from the English</span>
            </div>
            {draft.translation
              ? <p className="text-sm">{draft.translation}</p>
              : (
                <p className="text-sm text-muted-foreground">
                  Add a translation below, then use this to test recall.
                </p>
              )}
            {recallRevealed
              ? (
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7"
                    aria-label="Hear it"
                    onClick={() => speak(draft.text)}
                  >
                    <Volume2 className="size-4" />
                  </Button>
                  <p className="text-lg font-semibold">{draft.text}</p>
                </div>
              )
              : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!draft.translation}
                  onClick={() => setRecallRevealed(true)}
                >
                  Reveal the Japanese
                </Button>
              )}
          </div>
          <Field label="Natural translation">
            <Textarea
              value={draft.translation}
              onChange={e => set("translation", e.target.value)}
              placeholder="Can't even take a day off work — it's seriously a headache."
              rows={2}
            />
          </Field>
          {origin?.translation && !draft.translation
            ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => set("translation", origin.translation ?? "")}
              >
                Fill from bank sentence
              </Button>
            )
            : null}
          <Field
            label="Literal / structural gloss"
            hint="optional — only when the structure surprised you"
          >
            <Input
              value={draft.literal}
              onChange={e => set("literal", e.target.value)}
              placeholder="part-time-job ALSO rest-can't AND, seriously head SUBJ hurts"
            />
          </Field>
          <Field
            label="Nuance"
            hint="who says this, to whom, and what would be wrong instead"
          >
            <Textarea
              value={draft.nuance}
              onChange={e => set("nuance", e.target.value)}
              placeholder="Friends only. マジで would be jarring at work — 本当に there instead."
              rows={2}
            />
          </Field>
          {stepFooter("analyze")}
        </TabsContent>

        {/* 5 — Categorize */}
        <TabsContent
          value="categorize"
          className="space-y-5 pt-2"
        >
          <div
            className="
              grid gap-4
              sm:grid-cols-2
            "
          >
            <Field label="Register">
              <Select
                value={draft.register}
                onValueChange={v => set("register", v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REGISTERS.map(r => (
                    <SelectItem
                      key={r}
                      value={r}
                    >
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Page / location">
              <Input
                value={draft.page}
                onChange={e => set("page", e.target.value)}
                placeholder="p. 42"
              />
            </Field>
          </div>
          <SourcePicker
            value={draft.sourceId}
            onChange={id => set("sourceId", id)}
          />
          <div className="space-y-4">
            <TermPicker
              category="vocabulary"
              label="Vocabulary tags"
              value={termsFor("vocabulary")}
              onChange={n => setTermsFor("vocabulary", n)}
            />
            <TermPicker
              category="grammar"
              label="Grammar tags"
              value={termsFor("grammar")}
              onChange={n => setTermsFor("grammar", n)}
            />
            <TermPicker
              category="general"
              label="General tags"
              value={termsFor("general")}
              onChange={n => setTermsFor("general", n)}
            />
            <TermPicker
              category="resource"
              label="Textbook / Worksheet"
              value={termsFor("resource")}
              onChange={n => setTermsFor("resource", n)}
            />
          </div>
          {stepFooter("categorize")}
        </TabsContent>

        {/* 6 — Output */}
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

/** A labelled field wrapper with an optional hint. Labels are `text-sm` for readability. */
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-baseline gap-2">
        <Label className="text-sm">{label}</Label>
        {hint ? <span className="text-xs text-muted-foreground/80">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

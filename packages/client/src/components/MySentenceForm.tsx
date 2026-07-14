import type { DrillMistakeReasonRef, MySentence, SentenceTermRef } from "@sentence-bank/types";

import { useState } from "react";

import { termCategory } from "../lib/terms";

import { DrillReasonPicker } from "@/components/DrillReasonPicker";
import { TermPicker } from "@/components/TermPicker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateMySentence, useUpdateMySentence } from "@/hooks/useMySentences";

/**
 * Create/edit form for a My Sentence — independent of the practice worksheet. Collects the written
 * sentence plus the intended/actual meaning, an optional correction and explanation, a needs-correction
 * flag, and grammar/vocab/general tags. Passing `mySentence` puts it in edit mode (seeds the fields and
 * saves via update); otherwise it creates a new one.
 */
export function MySentenceForm({
  mySentence,
  onSuccess,
  lessonId,
  defaultLanguage,
}: {
  mySentence?: MySentence;
  onSuccess?: (id: string) => void;
  /** When creating from a lesson, links the new sentence to it. */
  lessonId?: string;
  /** Seeds the language field for a fresh sentence (e.g. the lesson's language). */
  defaultLanguage?: string;
}) {
  const create = useCreateMySentence();
  const update = useUpdateMySentence();
  const editing = mySentence !== undefined;

  const [text, setText] = useState(mySentence?.text ?? "");
  const [translation, setTranslation] = useState(mySentence?.translation ?? "");
  const [correction, setCorrection] = useState(mySentence?.correction ?? "");
  const [actualMeaning, setActualMeaning] = useState(mySentence?.actualMeaning ?? "");
  const [explanation, setExplanation] = useState(mySentence?.explanation ?? "");
  const [language, setLanguage] = useState(
    mySentence?.language ?? defaultLanguage ?? "Japanese",
  );
  const [needsCorrection, setNeedsCorrection] = useState(mySentence?.needsCorrection ?? true);
  const [reasons, setReasons] = useState<DrillMistakeReasonRef[]>(mySentence?.reasons ?? []);

  const initialTerms = mySentence?.terms ?? [];
  const [vocabTerms, setVocabTerms] = useState<SentenceTermRef[]>(
    initialTerms.filter(t => termCategory(t) === "vocabulary"),
  );
  const [grammarTerms, setGrammarTerms] = useState<SentenceTermRef[]>(
    initialTerms.filter(t => termCategory(t) === "grammar"),
  );
  const [generalTerms, setGeneralTerms] = useState<SentenceTermRef[]>(
    initialTerms.filter(t => termCategory(t) === "general"),
  );
  const [resourceTerms, setResourceTerms] = useState<SentenceTermRef[]>(
    initialTerms.filter(t => termCategory(t) === "resource"),
  );

  const pending = create.isPending || update.isPending;
  const canSubmit = text.trim().length > 0 && language.trim().length > 0 && !pending;

  const submit = async () => {
    if (!canSubmit) return;
    const terms = [...vocabTerms, ...grammarTerms, ...generalTerms, ...resourceTerms];
    const input = {
      text: text.trim(),
      language: language.trim(),
      translation: translation.trim() || null,
      correction: correction.trim() || null,
      needsCorrection,
      actualMeaning: actualMeaning.trim() || null,
      explanation: explanation.trim() || null,
      terms: terms.length > 0 ? terms : null,
      lessonId: mySentence?.lessonId ?? lessonId ?? null,
      reasons: reasons.length > 0 ? reasons : null,
    };
    const saved = editing
      ? await update.mutateAsync({
        id: mySentence.id,
        input,
      })
      : await create.mutateAsync(input);
    onSuccess?.(saved.id);
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="ms-text">Sentence you wrote</Label>
        <Textarea
          id="ms-text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="家賃も上がるし、まだローンもあるから、頭が痛いんだよね。"
          rows={2}
          className="text-lg"
        />
      </div>

      <div
        className="
          grid gap-4
          sm:grid-cols-2
        "
      >
        <div className="space-y-1.5">
          <Label htmlFor="ms-translation">Intended meaning</Label>
          <Textarea
            id="ms-translation"
            value={translation}
            onChange={e => setTranslation(e.target.value)}
            placeholder="What you meant to say"
            rows={2}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ms-actual">What it actually says</Label>
          <Textarea
            id="ms-actual"
            value={actualMeaning}
            onChange={e => setActualMeaning(e.target.value)}
            placeholder="The literal reading of what you wrote, if different"
            rows={2}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ms-correction">Correction</Label>
        <Textarea
          id="ms-correction"
          value={correction}
          onChange={e => setCorrection(e.target.value)}
          placeholder="The corrected sentence (leave blank to correct it later)"
          rows={2}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ms-explanation">Explanation</Label>
        <Textarea
          id="ms-explanation"
          value={explanation}
          onChange={e => setExplanation(e.target.value)}
          placeholder="Why it was wrong — e.g. a note from your tutor"
          rows={2}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Reasons</Label>
        <p className="text-xs text-muted-foreground">
          Categorize why it was wrong, using the same reasons as your drill sessions.
        </p>
        <DrillReasonPicker
          value={reasons}
          onChange={setReasons}
        />
      </div>

      <div
        className="flex flex-wrap items-end gap-6"
      >
        <div
          className="
            space-y-1.5
            sm:max-w-xs
          "
        >
          <Label htmlFor="ms-language">Language</Label>
          <Input
            id="ms-language"
            value={language}
            onChange={e => setLanguage(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <Checkbox
            checked={needsCorrection}
            onCheckedChange={v => setNeedsCorrection(v === true)}
          />
          Still needs correction
        </label>
      </div>

      <div
        className="
          grid gap-4
          sm:grid-cols-2
        "
      >
        <TermPicker
          category="vocabulary"
          label="Vocabulary tags"
          value={vocabTerms}
          onChange={setVocabTerms}
        />
        <TermPicker
          category="grammar"
          label="Grammar tags"
          value={grammarTerms}
          onChange={setGrammarTerms}
        />
        <TermPicker
          category="general"
          label="General tags"
          value={generalTerms}
          onChange={setGeneralTerms}
        />
        <TermPicker
          category="resource"
          label="Textbook / Worksheet"
          value={resourceTerms}
          onChange={setResourceTerms}
        />
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="submit"
          disabled={!canSubmit}
        >
          {pending
            ? "Saving…"
            : editing
              ? "Save changes"
              : "Add sentence"}
        </Button>
      </div>
    </form>
  );
}

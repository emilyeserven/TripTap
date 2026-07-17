import type { ParseResult } from "@/lib/parseTemplate";
import type {
  Capture,
  CreateSentenceInput,
  CreateVocabInput,
  ParseBoundary,
  ParseTarget,
} from "@sentence-bank/types";

import { useMemo, useState } from "react";

import { ParsePreviewSection } from "./ParsePreviewSection";
import { ParseSavedTemplatesBar } from "./ParseSavedTemplatesBar";
import { ParseTemplateEditor } from "./ParseTemplateEditor";
import { SharedCaptureFields } from "./SharedCaptureFields";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUpdateCapture } from "@/hooks/useCaptures";
import { useCreateParseTemplate, useDeleteParseTemplate, useParseTemplates } from "@/hooks/useParseTemplates";
import { useCreateSentencesMany } from "@/hooks/useSentences";
import { useCreateVocabMany, useVocab } from "@/hooks/useVocab";
import {
  DEFAULT_DIVIDER,
  DEFAULT_TEMPLATE,
  FIELD_CLASS,
  REQUIRED,
} from "@/lib/captureParseUi";
import { parseTemplate, splitOnDivider } from "@/lib/parseTemplate";

/** Workspace mode: create sentences, vocab, or both at once from a divider-split text. */
type Mode = ParseTarget | "merged";

/** Prefer a per-item tag value, else the batch/shared value, else empty. */
function pick(itemValue: string | undefined, shared: string): string {
  return (itemValue && itemValue.trim()) || shared.trim();
}

/**
 * Right-hand workspace of the capture detail page: parse the capture text into Sentences and/or
 * Vocab via a `{{tag}}` template, preview the result, and create the items (with shared batch
 * metadata and, for sentences, auto-suggested vocab links). In "merged" mode the text is split on
 * a configurable divider line into a sentence section (above) and a vocab section (below), so both
 * kinds can be created in one pass.
 */
export function CaptureParseWorkspace({
  capture,
}: { capture: Capture }) {
  const [mode, setMode] = useState<Mode>("sentence");
  const [workingText, setWorkingText] = useState(capture.cleanedText ?? capture.text);
  // Separate templates per target so "merged" mode can drive both at once.
  const [sentenceTemplate, setSentenceTemplate] = useState(DEFAULT_TEMPLATE.sentence);
  const [vocabTemplate, setVocabTemplate] = useState(DEFAULT_TEMPLATE.vocab);
  const [divider, setDivider] = useState(DEFAULT_DIVIDER);
  const [boundary, setBoundary] = useState<ParseBoundary>("fixed");
  const [ignoreBlankLines, setIgnoreBlankLines] = useState(true);

  // Shared (batch) values — applied to every item; a matching `{{tag}}` overrides per item.
  const [sourceId, setSourceId] = useState<string | null>(capture.sourceId);
  const [page, setPage] = useState(capture.page ?? "");
  const [language, setLanguage] = useState("Japanese");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");

  const [linkOverrides, setLinkOverrides] = useState<Record<number, string[]>>({});
  const [savedId, setSavedId] = useState("");
  const [done, setDone] = useState<string | null>(null);

  const {
    data: vocab,
  } = useVocab();
  const templatesQuery = useParseTemplates();
  const createTemplate = useCreateParseTemplate();
  const deleteTemplate = useDeleteParseTemplate();
  const createSentences = useCreateSentencesMany();
  const createVocab = useCreateVocabMany();
  const updateCapture = useUpdateCapture();

  const templateFor: Record<ParseTarget, string> = {
    sentence: sentenceTemplate,
    vocab: vocabTemplate,
  };
  const setTemplateFor: Record<ParseTarget, (v: string) => void> = {
    sentence: setSentenceTemplate,
    vocab: setVocabTemplate,
  };

  // Saved templates only apply to the single-target modes.
  const singleTarget: ParseTarget = mode === "vocab" ? "vocab" : "sentence";
  const savedForTarget = (templatesQuery.data ?? []).filter(t => t.target === singleTarget);

  // Parse each active target's section into items. In merged mode the text is split on the divider.
  const parsed = useMemo(() => {
    const shared = {
      boundary,
      ignoreBlankLines,
    };
    if (mode === "merged") {
      const [sentenceText, vocabText] = splitOnDivider(workingText, divider);
      return {
        sentence: parseTemplate(sentenceText, sentenceTemplate, {
          ...shared,
          requiredField: REQUIRED.sentence,
        }),
        vocab: parseTemplate(vocabText, vocabTemplate, {
          ...shared,
          requiredField: REQUIRED.vocab,
        }),
      };
    }
    if (mode === "sentence") {
      return {
        sentence: parseTemplate(workingText, sentenceTemplate, {
          ...shared,
          requiredField: REQUIRED.sentence,
        }),
        vocab: undefined,
      };
    }
    return {
      sentence: undefined,
      vocab: parseTemplate(workingText, vocabTemplate, {
        ...shared,
        requiredField: REQUIRED.vocab,
      }),
    };
  }, [mode, workingText, divider, sentenceTemplate, vocabTemplate, boundary, ignoreBlankLines]);

  const sentenceValid = parsed.sentence?.validCount ?? 0;
  const vocabValid = parsed.vocab?.validCount ?? 0;
  const totalValid = sentenceValid + vocabValid;

  function switchMode(next: Mode) {
    if (next === mode) return;
    setMode(next);
    setLinkOverrides({});
    setSavedId("");
    setDone(null);
  }

  /** Existing vocab whose term appears in the given sentence text (auto-link suggestions). */
  function suggestLinks(text: string): string[] {
    return (vocab ?? []).filter(v => v.term && text.includes(v.term)).map(v => v.id);
  }
  function linksFor(index: number, text: string): string[] {
    return linkOverrides[index] ?? suggestLinks(text);
  }
  function removeLink(index: number, text: string, id: string) {
    setLinkOverrides(o => ({
      ...o,
      [index]: linksFor(index, text).filter(v => v !== id),
    }));
  }
  const vocabName = (id: string) => vocab?.find(v => v.id === id)?.term ?? id;

  function loadSaved(id: string) {
    setSavedId(id);
    const t = savedForTarget.find(x => x.id === id);
    if (t) {
      setTemplateFor[singleTarget](t.body);
      setBoundary(t.boundary);
      setIgnoreBlankLines(t.ignoreBlankLines);
    }
  }

  async function saveTemplate() {
    const name = globalThis.prompt("Save this template as:");
    if (!name?.trim()) return;
    await createTemplate.mutateAsync({
      name: name.trim(),
      target: singleTarget,
      body: templateFor[singleTarget],
      boundary,
      ignoreBlankLines,
    });
  }

  /** Turn a parsed sentence section into create inputs, carrying shared metadata + vocab links. */
  function buildSentenceInputs(result: ParseResult): CreateSentenceInput[] {
    return result.items
      .map((item, index) => ({
        item,
        index,
      }))
      .filter(({
        item,
      }) => item.valid)
      .map(({
        item, index,
      }) => ({
        text: item.fields.text,
        translation: (item.fields.translation ?? "").trim() || null,
        language: pick(item.fields.language, language) || "Japanese",
        source: (item.fields.source ?? "").trim() || null,
        sourceId,
        page: pick(item.fields.page, page) || null,
        tags: pick(item.fields.tags, tags) || null,
        notes: pick(item.fields.notes, notes) || null,
        captureId: capture.id,
        vocabIds: linksFor(index, item.fields.text),
      }));
  }

  /** Turn a parsed vocab section into create inputs, carrying shared metadata. */
  function buildVocabInputs(result: ParseResult): CreateVocabInput[] {
    return result.items
      .filter(item => item.valid)
      .map(item => ({
        term: item.fields.term,
        reading: (item.fields.reading ?? "").trim() || null,
        meaning: (item.fields.meaning ?? "").trim() || null,
        language: pick(item.fields.language, language) || "Japanese",
        sourceId,
        page: pick(item.fields.page, page) || null,
        tags: pick(item.fields.tags, tags) || null,
        notes: pick(item.fields.notes, notes) || null,
        captureId: capture.id,
      }));
  }

  async function create() {
    setDone(null);
    const sentenceInputs = parsed.sentence ? buildSentenceInputs(parsed.sentence) : [];
    const vocabInputs = parsed.vocab ? buildVocabInputs(parsed.vocab) : [];
    if (sentenceInputs.length === 0 && vocabInputs.length === 0) return;

    const parts: string[] = [];
    if (sentenceInputs.length > 0) {
      await createSentences.mutateAsync(sentenceInputs);
      parts.push(`${sentenceInputs.length} sentence(s)`);
    }
    if (vocabInputs.length > 0) {
      await createVocab.mutateAsync(vocabInputs);
      parts.push(`${vocabInputs.length} vocab item(s)`);
    }
    setDone(`Created ${parts.join(" and ")}.`);

    if (capture.status !== "parsed") {
      await updateCapture.mutateAsync({
        id: capture.id,
        input: {
          status: "parsed",
        },
      });
    }
  }

  const busy = createSentences.isPending || createVocab.isPending;
  const createLabel = (() => {
    if (busy) return "Creating…";
    const parts: string[] = [];
    if (parsed.sentence) parts.push(`${sentenceValid} sentence(s)`);
    if (parsed.vocab) parts.push(`${vocabValid} vocab(s)`);
    return `Create ${parts.join(" + ")}`;
  })();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Create from text</CardTitle>
          <CardDescription>
            Split the text into items with a
            {" "}
            <code>{"{{tag}}"}</code>
            {" "}
            template, then create them. Merged mode creates sentences and vocab together.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mode */}
          <div className="flex gap-2">
            {(["sentence", "vocab", "merged"] as const).map(m => (
              <Button
                key={m}
                type="button"
                size="sm"
                variant={mode === m ? "default" : "outline"}
                onClick={() => switchMode(m)}
              >
                {m === "sentence" ? "Sentences" : m === "vocab" ? "Vocab" : "Merged"}
              </Button>
            ))}
          </div>

          {mode !== "merged"
            ? (
              <ParseSavedTemplatesBar
                templates={savedForTarget}
                savedId={savedId}
                savePending={createTemplate.isPending}
                onLoad={loadSaved}
                onSave={() => void saveTemplate()}
                onDelete={(id) => {
                  void deleteTemplate.mutateAsync(id);
                  setSavedId("");
                }}
              />
            )
            : null}

          {/* Working text */}
          <label className="block text-sm font-medium text-slate-700">
            Text to parse
            <textarea
              className={`
                ${FIELD_CLASS}
                font-mono
              `}
              rows={8}
              value={workingText}
              onChange={e => setWorkingText(e.target.value)}
            />
          </label>

          {/* Section divider (merged only) */}
          {mode === "merged"
            ? (
              <label className="block text-sm font-medium text-slate-700">
                Section divider (sentences above, vocab below)
                <input
                  className={`
                    ${FIELD_CLASS}
                    font-mono
                  `}
                  value={divider}
                  onChange={e => setDivider(e.target.value)}
                  placeholder={DEFAULT_DIVIDER}
                />
              </label>
            )
            : null}

          {/* Template(s) + tag chips */}
          {mode === "merged"
            ? (
              <div className="space-y-3">
                <ParseTemplateEditor
                  target="sentence"
                  label="Sentence template"
                  value={sentenceTemplate}
                  onChange={setSentenceTemplate}
                />
                <ParseTemplateEditor
                  target="vocab"
                  label="Vocab template"
                  value={vocabTemplate}
                  onChange={setVocabTemplate}
                />
              </div>
            )
            : (
              <ParseTemplateEditor
                target={singleTarget}
                label="Template"
                value={templateFor[singleTarget]}
                onChange={setTemplateFor[singleTarget]}
              />
            )}

          {/* Boundary */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="font-medium text-slate-700">Items:</span>
            {(["fixed", "blank"] as const).map(b => (
              <label
                key={b}
                className="flex items-center gap-1"
              >
                <input
                  type="radio"
                  checked={boundary === b}
                  onChange={() => setBoundary(b)}
                />
                {b === "fixed" ? "Every N lines (template height)" : "Blank-line separated"}
              </label>
            ))}
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={ignoreBlankLines}
                onChange={e => setIgnoreBlankLines(e.target.checked)}
              />
              Ignore blank lines
            </label>
          </div>

          {/* Shared values */}
          <SharedCaptureFields
            sourceId={sourceId}
            page={page}
            language={language}
            tags={tags}
            notes={notes}
            languageLabel="Language (shared)"
            onSourceIdChange={setSourceId}
            onPageChange={setPage}
            onLanguageChange={setLanguage}
            onTagsChange={setTags}
            onNotesChange={setNotes}
          />
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>
            Preview —
            {" "}
            {totalValid}
            {" "}
            item(s)
          </CardTitle>
          <CardDescription>
            Fields set here override the shared values; invalid items are skipped.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {parsed.sentence
            ? (
              <div className="space-y-2">
                {mode === "merged"
                  ? (
                    <h3 className="text-sm font-semibold text-slate-700">
                      Sentences —
                      {" "}
                      {sentenceValid}
                      {" "}
                      item(s)
                      {parsed.sentence.invalidCount > 0 ? `, ${parsed.sentence.invalidCount} skipped` : ""}
                    </h3>
                  )
                  : null}
                <ParsePreviewSection
                  target="sentence"
                  result={parsed.sentence}
                  linksFor={linksFor}
                  onRemoveLink={removeLink}
                  vocabName={vocabName}
                />
              </div>
            )
            : null}

          {parsed.vocab
            ? (
              <div className="space-y-2">
                {mode === "merged"
                  ? (
                    <h3 className="text-sm font-semibold text-slate-700">
                      Vocab —
                      {" "}
                      {vocabValid}
                      {" "}
                      item(s)
                      {parsed.vocab.invalidCount > 0 ? `, ${parsed.vocab.invalidCount} skipped` : ""}
                    </h3>
                  )
                  : null}
                <ParsePreviewSection
                  target="vocab"
                  result={parsed.vocab}
                />
              </div>
            )
            : null}

          {done ? <p className="text-sm font-medium text-green-700">{done}</p> : null}
          {createSentences.isError || createVocab.isError
            ? <p className="text-sm text-destructive">Could not create items.</p>
            : null}

          <Button
            type="button"
            onClick={() => void create()}
            disabled={busy || totalValid === 0}
          >
            {createLabel}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

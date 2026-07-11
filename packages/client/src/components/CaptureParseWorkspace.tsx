import type { ParseResult } from "@/lib/parseTemplate";
import type {
  Capture,
  CreateSentenceInput,
  CreateVocabInput,
  ParseBoundary,
  ParseTarget,
} from "@sentence-bank/types";

import { useMemo, useRef, useState } from "react";

import { SourcePicker } from "./SourcePicker";

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
import { parseTemplate, splitOnDivider } from "@/lib/parseTemplate";

const fieldClass
  = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

/** Workspace mode: create sentences, vocab, or both at once from a divider-split text. */
type Mode = ParseTarget | "merged";

const TAGS: Record<ParseTarget, string[]> = {
  sentence: ["text", "translation", "source", "page", "tags", "notes", "language"],
  vocab: ["term", "reading", "meaning", "page", "tags", "notes", "language"],
};
const REQUIRED: Record<ParseTarget, string> = {
  sentence: "text",
  vocab: "term",
};
const DEFAULT_TEMPLATE: Record<ParseTarget, string> = {
  sentence: "{{text}}\n{{translation}}",
  vocab: "{{term}}\t{{meaning}}",
};
const DEFAULT_DIVIDER = "---";

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
  const sentenceTemplateRef = useRef<HTMLTextAreaElement>(null);
  const vocabTemplateRef = useRef<HTMLTextAreaElement>(null);

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
  const setTemplateFor: Record<ParseTarget, (v: string | ((t: string) => string)) => void> = {
    sentence: setSentenceTemplate,
    vocab: setVocabTemplate,
  };
  const templateRefFor: Record<ParseTarget, React.RefObject<HTMLTextAreaElement | null>> = {
    sentence: sentenceTemplateRef,
    vocab: vocabTemplateRef,
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

  function insertTag(target: ParseTarget, tag: string) {
    const el = templateRefFor[target].current;
    const token = `{{${tag}}}`;
    if (!el) {
      setTemplateFor[target](t => t + token);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    setTemplateFor[target](t => t.slice(0, start) + token + t.slice(end));
    // Restore focus after React re-renders.
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + token.length;
    });
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

  async function loadSaved(id: string) {
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

  /** Editable template with clickable tag chips for a single target. */
  function templateEditor(target: ParseTarget, label: string) {
    return (
      <div>
        <span className="block text-sm font-medium text-slate-700">{label}</span>
        <div className="my-1 flex flex-wrap gap-1">
          {TAGS[target].map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => insertTag(target, tag)}
              className="
                rounded-sm border border-slate-300 px-1.5 py-0.5 font-mono
                text-xs text-slate-600
                hover:border-blue-400
              "
            >
              {`{{${tag}}}`}
            </button>
          ))}
        </div>
        <textarea
          ref={templateRefFor[target]}
          className={`
            ${fieldClass}
            mt-0 font-mono
          `}
          rows={2}
          value={templateFor[target]}
          onChange={e => setTemplateFor[target](e.target.value)}
        />
      </div>
    );
  }

  /** Preview list for one parsed section. `target` drives which fields + validity label to show. */
  function previewSection(target: ParseTarget, result: ParseResult) {
    return (
      <div className="space-y-2">
        {result.items.length === 0
          ? <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
          : result.items.map((item, i) => (
            <div
              key={i}
              className={`
                rounded-md border p-2 text-sm
                ${
            item.valid
              ? "border-input"
              : "border-dashed border-input opacity-50"
            }
              `}
            >
              <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                {TAGS[target]
                  .filter(f => item.fields[f])
                  .map(f => (
                    <span key={f}>
                      <span className="text-xs text-muted-foreground">
                        {f}
                        :
                      </span>
                      {" "}
                      {item.fields[f]}
                    </span>
                  ))}
                {!item.valid ? <span className="text-xs text-destructive">missing {REQUIRED[target]}</span> : null}
              </div>
              {target === "sentence" && item.valid && linksFor(i, item.fields.text).length > 0
                ? (
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    <span className="text-xs text-muted-foreground">vocab:</span>
                    {linksFor(i, item.fields.text).map(id => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => removeLink(i, item.fields.text, id)}
                        className="
                          rounded-full bg-blue-50 px-2 py-0.5 text-xs
                          text-blue-700
                          hover:line-through
                        "
                        title="Remove link"
                      >
                        {vocabName(id)}
                        {" ×"}
                      </button>
                    ))}
                  </div>
                )
                : null}
            </div>
          ))}
      </div>
    );
  }

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

          {/* Saved templates (single-target modes only) */}
          {mode !== "merged"
            ? (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className={`
                    ${fieldClass}
                    mt-0 max-w-52
                  `}
                  value={savedId}
                  onChange={e => void loadSaved(e.target.value)}
                  aria-label="Load saved template"
                >
                  <option value="">Saved templates…</option>
                  {savedForTarget.map(t => (
                    <option
                      key={t.id}
                      value={t.id}
                    >
                      {t.name}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void saveTemplate()}
                  disabled={createTemplate.isPending}
                >
                  Save template
                </Button>
                {savedId
                  ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        void deleteTemplate.mutateAsync(savedId);
                        setSavedId("");
                      }}
                    >
                      Delete
                    </Button>
                  )
                  : null}
              </div>
            )
            : null}

          {/* Working text */}
          <label className="block text-sm font-medium text-slate-700">
            Text to parse
            <textarea
              className={`
                ${fieldClass}
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
                    ${fieldClass}
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
                {templateEditor("sentence", "Sentence template")}
                {templateEditor("vocab", "Vocab template")}
              </div>
            )
            : templateEditor(singleTarget, "Template")}

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
          <div
            className="
              grid gap-3
              sm:grid-cols-2
            "
          >
            <SourcePicker
              value={sourceId}
              onChange={setSourceId}
            />
            <label className="block text-sm font-medium text-slate-700">
              Page / location (shared)
              <input
                className={fieldClass}
                value={page}
                onChange={e => setPage(e.target.value)}
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Language (shared)
              <input
                className={fieldClass}
                value={language}
                onChange={e => setLanguage(e.target.value)}
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Tags (shared)
              <input
                className={fieldClass}
                value={tags}
                onChange={e => setTags(e.target.value)}
              />
            </label>
            <label
              className="
                block text-sm font-medium text-slate-700
                sm:col-span-2
              "
            >
              Notes (shared)
              <input
                className={fieldClass}
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </label>
          </div>
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
                {previewSection("sentence", parsed.sentence)}
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
                {previewSection("vocab", parsed.vocab)}
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

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
import { parseTemplate } from "@/lib/parseTemplate";

const fieldClass
  = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

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

/** Prefer a per-item tag value, else the batch/shared value, else empty. */
function pick(itemValue: string | undefined, shared: string): string {
  return (itemValue && itemValue.trim()) || shared.trim();
}

/**
 * Right-hand workspace of the capture detail page: parse the capture text into Sentences or Vocab via
 * a `{{tag}}` template, preview the result, and create the items (with shared batch metadata and, for
 * sentences, auto-suggested vocab links).
 */
export function CaptureParseWorkspace({
  capture,
}: { capture: Capture }) {
  const [target, setTarget] = useState<ParseTarget>("sentence");
  const [workingText, setWorkingText] = useState(capture.text);
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE.sentence);
  const [boundary, setBoundary] = useState<ParseBoundary>("fixed");
  const [ignoreBlankLines, setIgnoreBlankLines] = useState(true);
  const templateRef = useRef<HTMLTextAreaElement>(null);

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

  const savedForTarget = (templatesQuery.data ?? []).filter(t => t.target === target);

  const parsed = useMemo(
    () => parseTemplate(workingText, template, {
      boundary,
      ignoreBlankLines,
      requiredField: REQUIRED[target],
    }),
    [workingText, template, boundary, ignoreBlankLines, target],
  );

  function switchTarget(next: ParseTarget) {
    if (next === target) return;
    setTarget(next);
    setTemplate(DEFAULT_TEMPLATE[next]);
    setLinkOverrides({});
    setSavedId("");
    setDone(null);
  }

  function insertTag(tag: string) {
    const el = templateRef.current;
    const token = `{{${tag}}}`;
    if (!el) {
      setTemplate(t => t + token);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    setTemplate(t => t.slice(0, start) + token + t.slice(end));
    // Restore focus after React re-renders.
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + token.length;
    });
  }

  /** Existing vocab whose term appears in the given text (sentence auto-link suggestions). */
  function suggestLinks(text: string): string[] {
    if (target !== "sentence") return [];
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
      setTemplate(t.body);
      setBoundary(t.boundary);
      setIgnoreBlankLines(t.ignoreBlankLines);
    }
  }

  async function saveTemplate() {
    const name = globalThis.prompt("Save this template as:");
    if (!name?.trim()) return;
    await createTemplate.mutateAsync({
      name: name.trim(),
      target,
      body: template,
      boundary,
      ignoreBlankLines,
    });
  }

  async function create() {
    setDone(null);
    const valid = parsed.items
      .map((item, index) => ({
        item,
        index,
      }))
      .filter(({
        item,
      }) => item.valid);
    if (valid.length === 0) return;

    if (target === "sentence") {
      const inputs: CreateSentenceInput[] = valid.map(({
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
        vocabIds: linksFor(index, item.fields.text),
      }));
      await createSentences.mutateAsync(inputs);
      setDone(`Created ${inputs.length} sentence(s).`);
    }
    else {
      const inputs: CreateVocabInput[] = valid.map(({
        item,
      }) => ({
        term: item.fields.term,
        reading: (item.fields.reading ?? "").trim() || null,
        meaning: (item.fields.meaning ?? "").trim() || null,
        language: pick(item.fields.language, language) || "Japanese",
        sourceId,
        page: pick(item.fields.page, page) || null,
        tags: pick(item.fields.tags, tags) || null,
        notes: pick(item.fields.notes, notes) || null,
      }));
      await createVocab.mutateAsync(inputs);
      setDone(`Created ${inputs.length} vocab item(s).`);
    }

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
            template, then create them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Target */}
          <div className="flex gap-2">
            {(["sentence", "vocab"] as const).map(t => (
              <Button
                key={t}
                type="button"
                size="sm"
                variant={target === t ? "default" : "outline"}
                onClick={() => switchTarget(t)}
              >
                {t === "sentence" ? "Sentences" : "Vocab"}
              </Button>
            ))}
          </div>

          {/* Saved templates */}
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

          {/* Template + tag chips */}
          <div>
            <span className="block text-sm font-medium text-slate-700">Template</span>
            <div className="my-1 flex flex-wrap gap-1">
              {TAGS[target].map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => insertTag(tag)}
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
              ref={templateRef}
              className={`
                ${fieldClass}
                mt-0 font-mono
              `}
              rows={2}
              value={template}
              onChange={e => setTemplate(e.target.value)}
            />
          </div>

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
            {parsed.validCount}
            {" "}
            item(s)
            {parsed.invalidCount > 0 ? `, ${parsed.invalidCount} skipped` : ""}
          </CardTitle>
          <CardDescription>
            {`Fields set here override the shared values; invalid items (missing ${REQUIRED[target]}) are skipped.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {parsed.items.length === 0
            ? <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
            : parsed.items.map((item, i) => (
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

          {done ? <p className="text-sm font-medium text-green-700">{done}</p> : null}
          {createSentences.isError || createVocab.isError
            ? <p className="text-sm text-destructive">Could not create items.</p>
            : null}

          <Button
            type="button"
            onClick={() => void create()}
            disabled={busy || parsed.validCount === 0}
          >
            {busy ? "Creating…" : `Create ${parsed.validCount} ${target === "sentence" ? "sentence" : "vocab"}(s)`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

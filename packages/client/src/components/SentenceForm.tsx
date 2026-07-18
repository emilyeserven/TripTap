import type { Sentence, SentenceTermRef } from "@sentence-bank/types";

import { useId, useMemo, useState } from "react";

import { useForm } from "@tanstack/react-form";
import { PenLine } from "lucide-react";
import { z } from "zod";

import { FuriganaEditor } from "./FuriganaEditor";
import { SourcePicker } from "./SourcePicker";
import { TermPicker } from "./TermPicker";
import { VocabLinkPicker } from "./VocabLinkPicker";
import {
  useCreateSentence,
  useDeleteSentence,
  useSentences,
  useUpdateSentence,
} from "../hooks/useSentences";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";
import { Textarea } from "@/components/ui/textarea";
import { groupTermsByCategory } from "@/lib/terms";

const sentenceSchema = z.object({
  text: z.string().min(1, "Sentence text is required"),
  // Optional: a sentence can be saved text-only and translated later.
  translation: z.string(),
  language: z.string().min(1, "Language is required"),
  page: z.string(),
  tags: z.string(),
  notes: z.string(),
});

const KANJI = /[㐀-䶿一-鿿々]/;

/** Split the free-text comma-separated `tags` string into trimmed, non-empty tag names. */
function splitTags(value: string): string[] {
  return value.split(",").map(tag => tag.trim()).filter(Boolean);
}

/** The prefillable text fields — a subset of the form used to seed it (e.g. from the Capture flow). */
export interface SentenceFormInitialValues {
  text?: string;
  translation?: string;
  language?: string;
  page?: string;
  tags?: string;
  notes?: string;
  sourceId?: string | null;
}

/**
 * Sentence form. In create mode it owns a create mutation; pass an existing `sentence` to switch to
 * edit mode (hydrates every field + the four term channels and saves via the update mutation). Edit
 * mode also hosts the per-sentence Delete and furigana editor. Owns its own mutations so the page
 * stays focused on the list.
 */
export function SentenceForm({
  onSuccess,
  initialValues,
  sentence,
}: {
  onSuccess?: () => void;
  initialValues?: SentenceFormInitialValues;
  /** When provided, the form edits this sentence instead of creating a new one. */
  sentence?: Sentence;
}) {
  const isEdit = Boolean(sentence);
  const createSentence = useCreateSentence();
  const updateSentence = useUpdateSentence();
  const deleteSentence = useDeleteSentence();
  const mutation = isEdit ? updateSentence : createSentence;

  // All existing bank tags, offered as combobox options (plus whatever is already selected).
  const {
    data: allSentences,
  } = useSentences();
  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const s of allSentences ?? []) {
      for (const tag of splitTags(s.tags ?? "")) set.add(tag);
    }
    return [...set].sort();
  }, [allSentences]);

  // In edit mode, seed the per-channel pickers from the sentence's stored terms.
  const termGroups = sentence ? groupTermsByCategory(sentence.terms ?? []) : null;

  const [sourceId, setSourceId] = useState<string | null>(
    sentence?.sourceId ?? initialValues?.sourceId ?? null,
  );
  const [vocabIds, setVocabIds] = useState<string[]>([]);
  const [vocabTerms, setVocabTerms] = useState<SentenceTermRef[]>(termGroups?.vocabulary ?? []);
  const [grammarTerms, setGrammarTerms] = useState<SentenceTermRef[]>(termGroups?.grammar ?? []);
  const [generalTerms, setGeneralTerms] = useState<SentenceTermRef[]>(termGroups?.general ?? []);
  const [resourceTerms, setResourceTerms] = useState<SentenceTermRef[]>(termGroups?.resource ?? []);
  const [editFuri, setEditFuri] = useState(false);

  const hasKanji = sentence ? KANJI.test(sentence.text) : false;

  const form = useForm({
    defaultValues: {
      text: sentence?.text ?? initialValues?.text ?? "",
      translation: sentence?.translation ?? initialValues?.translation ?? "",
      language: sentence?.language ?? initialValues?.language ?? "",
      page: sentence?.page ?? initialValues?.page ?? "",
      tags: sentence?.tags ?? initialValues?.tags ?? "",
      notes: sentence?.notes ?? initialValues?.notes ?? "",
    },
    validators: {
      onChange: sentenceSchema,
    },
    onSubmit: async ({
      value,
    }) => {
      const terms = [...vocabTerms, ...grammarTerms, ...generalTerms, ...resourceTerms];
      const input = {
        text: value.text,
        translation: value.translation || null,
        language: value.language,
        sourceId,
        page: value.page || null,
        tags: value.tags || null,
        terms: terms.length > 0 ? terms : null,
        notes: value.notes || null,
      };
      if (sentence) {
        // Vocab links are managed via "Break it down"; the update endpoint ignores vocabIds.
        await updateSentence.mutateAsync({
          id: sentence.id,
          input,
        });
      }
      else {
        await createSentence.mutateAsync({
          ...input,
          vocabIds,
        });
        form.reset();
        setSourceId(null);
        setVocabIds([]);
        setVocabTerms([]);
        setGrammarTerms([]);
        setGeneralTerms([]);
        setResourceTerms([]);
      }
      onSuccess?.();
    },
  });

  function remove() {
    if (!sentence) return;
    if (!globalThis.confirm("Delete this sentence?")) return;
    deleteSentence.mutate(sentence.id, {
      onSuccess,
    });
  }

  return (
    <form
      className="
        grid gap-4
        sm:grid-cols-2
      "
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <form.Field name="text">
        {field => (
          <TextAreaField
            label="Sentence"
            value={field.state.value}
            errors={field.state.meta.errors}
            onBlur={field.handleBlur}
            onChange={field.handleChange}
          />
        )}
      </form.Field>

      <form.Field name="translation">
        {field => (
          <TextAreaField
            label="Translation"
            value={field.state.value}
            errors={field.state.meta.errors}
            onBlur={field.handleBlur}
            onChange={field.handleChange}
          />
        )}
      </form.Field>

      <form.Field name="language">
        {field => (
          <TextField
            label="Language"
            value={field.state.value}
            errors={field.state.meta.errors}
            onBlur={field.handleBlur}
            onChange={field.handleChange}
          />
        )}
      </form.Field>

      <SourcePicker
        value={sourceId}
        onChange={setSourceId}
      />

      <form.Field name="page">
        {field => (
          <TextField
            label="Page / location"
            value={field.state.value}
            errors={field.state.meta.errors}
            onBlur={field.handleBlur}
            onChange={field.handleChange}
          />
        )}
      </form.Field>

      <form.Field name="tags">
        {(field) => {
          const selected = splitTags(field.state.value);
          const options = [...new Set([...allTags, ...selected])].map(tag => ({
            value: tag,
            label: tag,
          }));
          return (
            <div
              className="
                space-y-1.5
                sm:col-span-2
              "
            >
              <Label>Tags</Label>
              <MultiSelect
                value={selected}
                onChange={next => field.handleChange(next.join(", "))}
                options={options}
                ariaLabel="Tags"
                placeholder="Add tags…"
                searchPlaceholder="Search or create a tag…"
                emptyText="No tags yet — type to create one."
                creatable
                onCreate={(name) => {
                  if (!selected.includes(name)) field.handleChange([...selected, name].join(", "));
                }}
              />
            </div>
          );
        }}
      </form.Field>

      <div
        className="
          grid gap-4
          sm:col-span-2 sm:grid-cols-2
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
          label="Resources"
          value={resourceTerms}
          onChange={setResourceTerms}
        />
      </div>

      {isEdit
        ? null
        : (
          <div className="sm:col-span-2">
            <VocabLinkPicker
              value={vocabIds}
              onChange={setVocabIds}
            />
          </div>
        )}

      <form.Field name="notes">
        {field => (
          <div
            className="
              space-y-1.5
              sm:col-span-2
            "
          >
            <Label htmlFor="sentence-notes">Notes</Label>
            <Textarea
              id="sentence-notes"
              rows={2}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={event => field.handleChange(event.target.value)}
            />
          </div>
        )}
      </form.Field>

      {isEdit && sentence && hasKanji
        ? (
          <div
            className="
              space-y-2
              sm:col-span-2
            "
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditFuri(v => !v)}
            >
              <PenLine className="size-4" />
              {editFuri ? "Close furigana" : "Edit furigana"}
            </Button>
            {editFuri
              ? (
                <FuriganaEditor
                  sentence={sentence}
                  onClose={() => setEditFuri(false)}
                />
              )
              : null}
          </div>
        )
        : null}

      <div
        className="
          space-y-2
          sm:col-span-2
        "
      >
        <div className="flex items-center gap-3">
          <form.Subscribe selector={state => [state.canSubmit, state.isSubmitting] as const}>
            {([canSubmit, isSubmitting]) => (
              <Button
                type="submit"
                disabled={!canSubmit}
              >
                {isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Add sentence"}
              </Button>
            )}
          </form.Subscribe>
          {isEdit
            ? (
              <Button
                type="button"
                variant="ghost"
                className="ml-auto text-destructive"
                disabled={deleteSentence.isPending}
                onClick={remove}
              >
                {deleteSentence.isPending ? "Deleting…" : "Delete"}
              </Button>
            )
            : null}
        </div>
        {mutation.isError ? <p className="text-sm text-destructive">{mutation.error?.message}</p> : null}
      </div>
    </form>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  errors: unknown[];
  type?: string;
  onBlur: () => void;
  onChange: (value: string) => void;
}

function fieldMessages(errors: unknown[]): string[] {
  return errors
    .map(error => (typeof error === "string" ? error : (error as { message?: string })?.message))
    .filter((message): message is string => Boolean(message));
}

function TextField({
  label, value, errors, type = "text", onBlur, onChange,
}: TextFieldProps) {
  const id = useId();
  const messages = fieldMessages(errors);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onBlur={onBlur}
        onChange={event => onChange(event.target.value)}
      />
      {messages.length > 0 ? <p className="text-xs text-destructive">{messages.join(", ")}</p> : null}
    </div>
  );
}

interface TextAreaFieldProps {
  label: string;
  value: string;
  errors: unknown[];
  onBlur: () => void;
  onChange: (value: string) => void;
}

function TextAreaField({
  label, value, errors, onBlur, onChange,
}: TextAreaFieldProps) {
  const id = useId();
  const messages = fieldMessages(errors);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        rows={2}
        value={value}
        onBlur={onBlur}
        onChange={event => onChange(event.target.value)}
      />
      {messages.length > 0 ? <p className="text-xs text-destructive">{messages.join(", ")}</p> : null}
    </div>
  );
}

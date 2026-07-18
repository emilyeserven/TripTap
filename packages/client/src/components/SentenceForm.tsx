import type { Sentence, SentenceTermRef } from "@sentence-bank/types";

import { useState } from "react";

import { useForm } from "@tanstack/react-form";
import { z } from "zod";

import { SourcePicker } from "./SourcePicker";
import { TermPicker } from "./TermPicker";
import { VocabLinkPicker } from "./VocabLinkPicker";
import { useCreateSentence, useUpdateSentence } from "../hooks/useSentences";

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

const fieldClass
  = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";

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
 * edit mode (hydrates every field + the four term channels and saves via the update mutation). Owns
 * its own mutation so the page stays focused on the list.
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
  const mutation = isEdit ? updateSentence : createSentence;

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

  return (
    <form
      className="
        grid gap-4 rounded-lg border border-slate-200 bg-white p-4
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
        {field => (
          <TextField
            label="Tags (comma-separated)"
            value={field.state.value}
            errors={field.state.meta.errors}
            onBlur={field.handleBlur}
            onChange={field.handleChange}
          />
        )}
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
          <label
            className="
              block text-sm font-medium text-slate-700
              sm:col-span-2
            "
          >
            Notes
            <textarea
              className={fieldClass}
              rows={2}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={event => field.handleChange(event.target.value)}
            />
          </label>
        )}
      </form.Field>

      <div className="sm:col-span-2">
        <form.Subscribe selector={state => [state.canSubmit, state.isSubmitting] as const}>
          {([canSubmit, isSubmitting]) => (
            <button
              type="submit"
              disabled={!canSubmit}
              className="
                rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white
                hover:bg-blue-700
                disabled:opacity-50
              "
            >
              {isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Add sentence"}
            </button>
          )}
        </form.Subscribe>
        {mutation.isError ? <p className="mt-2 text-sm text-red-600">{mutation.error?.message}</p> : null}
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
  const messages = fieldMessages(errors);

  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        type={type}
        className={fieldClass}
        value={value}
        onBlur={onBlur}
        onChange={event => onChange(event.target.value)}
      />
      {messages.length > 0 ? <span className="mt-1 block text-xs text-red-600">{messages.join(", ")}</span> : null}
    </label>
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
  const messages = fieldMessages(errors);

  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <textarea
        className={fieldClass}
        rows={2}
        value={value}
        onBlur={onBlur}
        onChange={event => onChange(event.target.value)}
      />
      {messages.length > 0 ? <span className="mt-1 block text-xs text-red-600">{messages.join(", ")}</span> : null}
    </label>
  );
}

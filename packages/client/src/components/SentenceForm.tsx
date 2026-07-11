import { useState } from "react";

import { useForm } from "@tanstack/react-form";
import { z } from "zod";

import { SourcePicker } from "./SourcePicker";
import { VocabLinkPicker } from "./VocabLinkPicker";
import { useCreateSentence } from "../hooks/useSentences";

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

/** Create-sentence form. Owns its own mutation so the page stays focused on the list. */
export function SentenceForm({
  onSuccess,
  initialValues,
}: {
  onSuccess?: () => void;
  initialValues?: SentenceFormInitialValues;
}) {
  const createSentence = useCreateSentence();
  const [sourceId, setSourceId] = useState<string | null>(initialValues?.sourceId ?? null);
  const [vocabIds, setVocabIds] = useState<string[]>([]);

  const form = useForm({
    defaultValues: {
      text: initialValues?.text ?? "",
      translation: initialValues?.translation ?? "",
      language: initialValues?.language ?? "",
      page: initialValues?.page ?? "",
      tags: initialValues?.tags ?? "",
      notes: initialValues?.notes ?? "",
    },
    validators: {
      onChange: sentenceSchema,
    },
    onSubmit: async ({
      value,
    }) => {
      await createSentence.mutateAsync({
        text: value.text,
        translation: value.translation || null,
        language: value.language,
        sourceId,
        page: value.page || null,
        tags: value.tags || null,
        notes: value.notes || null,
        vocabIds,
      });
      form.reset();
      setSourceId(null);
      setVocabIds([]);
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

      <div className="sm:col-span-2">
        <VocabLinkPicker
          value={vocabIds}
          onChange={setVocabIds}
        />
      </div>

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
              {isSubmitting ? "Saving…" : "Add sentence"}
            </button>
          )}
        </form.Subscribe>
        {createSentence.isError ? <p className="mt-2 text-sm text-red-600">{createSentence.error?.message}</p> : null}
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

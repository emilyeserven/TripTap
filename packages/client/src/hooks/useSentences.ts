import type { CreateSentenceInput, Sentence, UpdateSentenceInput } from "@sentence-bank/types";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { sentencesApi } from "../lib/api";

const SENTENCES_KEY = ["sentences"] as const;

/** Invalidate both the sentence list and any capture-scoped sentence lists. */
function useSentenceInvalidator() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({
      queryKey: SENTENCES_KEY,
    });
    queryClient.invalidateQueries({
      queryKey: ["captures"],
    });
  };
}

/** Toast if any created/updated sentence came back with a furigana generation error. */
function toastReadingErrors(result: Sentence | Sentence[]) {
  const errored = (Array.isArray(result) ? result : [result]).filter(s => s.readingError);
  if (errored.length === 0) return;
  toast.error(
    errored.length === 1 ? "Furigana generation failed" : `Furigana failed for ${errored.length} sentences`,
    {
      description: errored[0].readingError ?? undefined,
    },
  );
}

export function useSentences() {
  return useQuery({
    queryKey: SENTENCES_KEY,
    queryFn: sentencesApi.list,
  });
}

/** The bank vocab linked to a sentence ("break it down"). Pass `enabled: false` to defer the fetch. */
export function useSentenceVocab(id: string, enabled = true) {
  return useQuery({
    queryKey: [...SENTENCES_KEY, id, "vocab"],
    queryFn: () => sentencesApi.getVocab(id),
    enabled,
  });
}

export function useCreateSentence() {
  const invalidate = useSentenceInvalidator();
  return useMutation({
    mutationFn: (input: CreateSentenceInput) => sentencesApi.create(input),
    onSuccess: (sentence) => {
      invalidate();
      toastReadingErrors(sentence);
    },
  });
}

export function useCreateSentencesMany() {
  const invalidate = useSentenceInvalidator();
  return useMutation({
    mutationFn: (inputs: CreateSentenceInput[]) => sentencesApi.createMany(inputs),
    onSuccess: (created) => {
      invalidate();
      toastReadingErrors(created);
    },
  });
}

export function useUpdateSentence() {
  const invalidate = useSentenceInvalidator();
  return useMutation({
    mutationFn: ({
      id, input,
    }: { id: string;
      input: UpdateSentenceInput; }) =>
      sentencesApi.update(id, input),
    onSuccess: (sentence) => {
      invalidate();
      toastReadingErrors(sentence);
    },
  });
}

export function useDeleteSentence() {
  const invalidate = useSentenceInvalidator();
  return useMutation({
    mutationFn: (id: string) => sentencesApi.remove(id),
    onSuccess: invalidate,
  });
}

/** Generate furigana for every sentence that lacks it (one-time backfill). */
export function useBackfillFurigana() {
  const invalidate = useSentenceInvalidator();
  return useMutation({
    mutationFn: () => sentencesApi.backfillFurigana(),
    onSuccess: ({
      updated, errors,
    }) => {
      invalidate();
      if (errors > 0) toast.error(`Furigana failed for ${errors} sentence(s)`);
      if (updated > 0) toast.success(`Generated furigana for ${updated} sentence(s)`);
      if (updated === 0 && errors === 0) toast("No sentences needed furigana");
    },
    onError: err => toast.error("Couldn't generate furigana", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

/** Re-run furigana generation for one sentence (applies current vocab overrides). */
export function useRegenerateFurigana() {
  const invalidate = useSentenceInvalidator();
  return useMutation({
    mutationFn: (id: string) => sentencesApi.regenerateFurigana(id),
    onSuccess: (sentence) => {
      invalidate();
      toastReadingErrors(sentence);
    },
    onError: err => toast.error("Couldn't generate furigana", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

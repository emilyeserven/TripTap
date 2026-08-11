import type { SentenceListFilters } from "../lib/api";
import type {
  CreateSentenceInput,
  Sentence,
  SentenceImportInput,
  UpdateSentenceInput,
} from "@sentence-bank/types";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { sentencesApi } from "../lib/api";

import { useEntityCacheSync } from "@/hooks/useEntityCacheSync";

const SENTENCES_KEY = ["sentences"] as const;

/** A stable list key for a filter set — normalized so `{}`/omitted and kind order don't fork caches. */
function listKey(filters: SentenceListFilters = {}) {
  const kinds = filters.kind == null ? [] : Array.isArray(filters.kind) ? filters.kind : [filters.kind];
  return [
    ...SENTENCES_KEY,
    "list",
    {
      kind: [...kinds].sort().join(","),
      derivedFromId: filters.derivedFromId ?? "",
      lessonId: filters.lessonId ?? "",
      writingId: filters.writingId ?? "",
      captureId: filters.captureId ?? "",
      needsCorrection: filters.needsCorrection ?? null,
      shadowingCandidate: filters.shadowingCandidate ?? null,
    },
  ] as const;
}

/** Invalidate every sentence query (lists, details, vocab) and any capture-scoped sentence lists. */
function useSentenceInvalidator() {
  const {
    invalidate,
  } = useEntityCacheSync(SENTENCES_KEY, [["captures"]]);
  return invalidate;
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

/** Sentences of any kind, optionally narrowed (`{ kind: "bank" }`, `{ lessonId }`, …). */
export function useSentences(filters: SentenceListFilters = {}) {
  return useQuery({
    queryKey: listKey(filters),
    queryFn: () => sentencesApi.list(filters),
  });
}

/** A single sentence by id (for the detail / edit pages). */
export function useSentence(id: string) {
  return useQuery({
    queryKey: [...SENTENCES_KEY, id],
    queryFn: () => sentencesApi.get(id),
  });
}

/** The mine-kind sentences produced from a given practice sentence (0 or more). */
export function useSentencesForPractice(practiceSentenceId: string) {
  return useSentences({
    kind: "mine",
    derivedFromId: practiceSentenceId,
  });
}

/** The mine-kind sentences added from a given tutoring lesson (0 or more). */
export function useSentencesForLesson(lessonId: string) {
  return useSentences({
    kind: "mine",
    lessonId,
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
  const {
    seed,
  } = useEntityCacheSync(SENTENCES_KEY, [["captures"]]);
  return useMutation({
    mutationFn: (input: CreateSentenceInput) => sentencesApi.create(input),
    onSuccess: (sentence) => {
      seed(sentence);
      toastReadingErrors(sentence);
    },
    onError: err => toast.error("Couldn't save the sentence", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useCreateSentencesMany() {
  const {
    seedMany,
  } = useEntityCacheSync(SENTENCES_KEY, [["captures"]]);
  return useMutation({
    mutationFn: (inputs: CreateSentenceInput[]) => sentencesApi.createMany(inputs),
    onSuccess: (created) => {
      seedMany(created);
      toastReadingErrors(created);
    },
    onError: err => toast.error("Couldn't import the sentences", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useUpdateSentence() {
  const {
    seed,
  } = useEntityCacheSync(SENTENCES_KEY, [["captures"]]);
  return useMutation({
    mutationFn: ({
      id, input,
    }: { id: string;
      input: UpdateSentenceInput; }) =>
      sentencesApi.update(id, input),
    onSuccess: (sentence) => {
      seed(sentence);
      toastReadingErrors(sentence);
    },
    onError: err => toast.error("Couldn't update the sentence", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useDeleteSentence() {
  const invalidate = useSentenceInvalidator();
  return useMutation({
    mutationFn: (id: string) => sentencesApi.remove(id),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't delete the sentence", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

/** Import a pasted AI breakdown as one practice-kind sentence. */
export function useImportSentence() {
  const {
    seed,
  } = useEntityCacheSync(SENTENCES_KEY, [["captures"]]);
  return useMutation({
    mutationFn: (input: SentenceImportInput) => sentencesApi.import(input),
    onSuccess: seed,
    onError: err => toast.error("Couldn't import the breakdown", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

/** Upload (or replace) a sentence's inline context screenshot. */
export function useUploadSentenceImage() {
  const {
    seed,
  } = useEntityCacheSync(SENTENCES_KEY, [["captures"]]);
  return useMutation({
    mutationFn: ({
      id, file,
    }: { id: string;
      file: File; }) => sentencesApi.uploadImage(id, file),
    onSuccess: seed,
    onError: err => toast.error("Couldn't upload the screenshot", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

/** Remove a sentence's inline context screenshot. */
export function useRemoveSentenceImage() {
  const invalidate = useSentenceInvalidator();
  return useMutation({
    mutationFn: (id: string) => sentencesApi.removeImage(id),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't remove the screenshot", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

/** Replace the full set of vocab linked to a sentence. */
export function useSetSentenceVocab() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id, vocabIds,
    }: { id: string;
      vocabIds: string[]; }) =>
      sentencesApi.setVocab(id, vocabIds),
    onSuccess: (_data, {
      id,
    }) => {
      queryClient.invalidateQueries({
        queryKey: [...SENTENCES_KEY, id, "vocab"],
      });
      // A newly-created linked vocab should show up in the vocab bank too.
      queryClient.invalidateQueries({
        queryKey: ["vocab"],
      });
    },
    onError: err => toast.error("Couldn't update linked vocab", {
      description: err instanceof Error ? err.message : undefined,
    }),
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

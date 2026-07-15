import type { CreateMySentenceInput, UpdateMySentenceInput } from "@sentence-bank/types";

import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { useEntityCacheSync } from "./useEntityCacheSync";
import { mySentencesApi } from "../lib/api";

const MY_SENTENCES_KEY = ["my-sentences"] as const;

export function useMySentences() {
  return useQuery({
    queryKey: MY_SENTENCES_KEY,
    queryFn: () => mySentencesApi.list(),
  });
}

/** A single my-sentence by id (for its view / edit pages). */
export function useMySentence(id: string) {
  return useQuery({
    queryKey: [...MY_SENTENCES_KEY, id],
    queryFn: () => mySentencesApi.get(id),
  });
}

/** The my-sentences produced from a given practice sentence (0 or more). */
export function useMySentencesForPractice(practiceSentenceId: string) {
  return useQuery({
    queryKey: [...MY_SENTENCES_KEY, "for-practice", practiceSentenceId],
    queryFn: () => mySentencesApi.list({
      practiceSentenceId,
    }),
  });
}

/** The my-sentences added from a given tutoring lesson (0 or more). */
export function useMySentencesForLesson(lessonId: string) {
  return useQuery({
    queryKey: [...MY_SENTENCES_KEY, "for-lesson", lessonId],
    queryFn: () => mySentencesApi.list({
      lessonId,
    }),
  });
}

export function useCreateMySentence() {
  const {
    seed,
  } = useEntityCacheSync(MY_SENTENCES_KEY);
  return useMutation({
    mutationFn: (input: CreateMySentenceInput) => mySentencesApi.create(input),
    onSuccess: seed,
    onError: err => toast.error("Couldn't save your sentence", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

/** Bulk-create many my-sentences from pasted content in a single request. */
export function useCreateMySentencesMany() {
  const {
    seedMany,
  } = useEntityCacheSync(MY_SENTENCES_KEY);
  return useMutation({
    mutationFn: (inputs: CreateMySentenceInput[]) => mySentencesApi.createMany(inputs),
    onSuccess: seedMany,
    onError: err => toast.error("Couldn't import your sentences", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useUpdateMySentence() {
  const {
    seed,
  } = useEntityCacheSync(MY_SENTENCES_KEY);
  return useMutation({
    mutationFn: ({
      id, input,
    }: { id: string;
      input: UpdateMySentenceInput; }) =>
      mySentencesApi.update(id, input),
    onSuccess: seed,
    onError: err => toast.error("Couldn't update your sentence", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useDeleteMySentence() {
  const {
    invalidate,
  } = useEntityCacheSync(MY_SENTENCES_KEY);
  return useMutation({
    mutationFn: (id: string) => mySentencesApi.remove(id),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't delete your sentence", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

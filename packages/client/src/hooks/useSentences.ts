import type { CreateSentenceInput, UpdateSentenceInput } from "@sentence-bank/types";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
    onSuccess: invalidate,
  });
}

export function useCreateSentencesMany() {
  const invalidate = useSentenceInvalidator();
  return useMutation({
    mutationFn: (inputs: CreateSentenceInput[]) => sentencesApi.createMany(inputs),
    onSuccess: invalidate,
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
    onSuccess: invalidate,
  });
}

export function useDeleteSentence() {
  const invalidate = useSentenceInvalidator();
  return useMutation({
    mutationFn: (id: string) => sentencesApi.remove(id),
    onSuccess: invalidate,
  });
}

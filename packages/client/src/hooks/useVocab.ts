import type { CreateVocabInput, UpdateVocabInput } from "@sentence-bank/types";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { vocabApi } from "../lib/api";

const VOCAB_KEY = ["vocab"] as const;

/** Invalidate both the vocab list and any capture-scoped vocab lists. */
function useVocabInvalidator() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({
      queryKey: VOCAB_KEY,
    });
    queryClient.invalidateQueries({
      queryKey: ["captures"],
    });
  };
}

export function useVocab() {
  return useQuery({
    queryKey: VOCAB_KEY,
    queryFn: vocabApi.list,
  });
}

export function useCreateVocab() {
  const invalidate = useVocabInvalidator();
  return useMutation({
    mutationFn: (input: CreateVocabInput) => vocabApi.create(input),
    onSuccess: invalidate,
  });
}

export function useCreateVocabMany() {
  const invalidate = useVocabInvalidator();
  return useMutation({
    mutationFn: (inputs: CreateVocabInput[]) => vocabApi.createMany(inputs),
    onSuccess: invalidate,
  });
}

export function useUpdateVocab() {
  const invalidate = useVocabInvalidator();
  return useMutation({
    mutationFn: ({
      id, input,
    }: { id: string;
      input: UpdateVocabInput; }) =>
      vocabApi.update(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteVocab() {
  const invalidate = useVocabInvalidator();
  return useMutation({
    mutationFn: (id: string) => vocabApi.remove(id),
    onSuccess: invalidate,
  });
}

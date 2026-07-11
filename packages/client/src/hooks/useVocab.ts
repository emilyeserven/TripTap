import type { CreateVocabInput } from "@sentence-bank/types";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { vocabApi } from "../lib/api";

const VOCAB_KEY = ["vocab"] as const;

export function useVocab() {
  return useQuery({
    queryKey: VOCAB_KEY,
    queryFn: vocabApi.list,
  });
}

export function useCreateVocab() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateVocabInput) => vocabApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: VOCAB_KEY,
    }),
  });
}

export function useCreateVocabMany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (inputs: CreateVocabInput[]) => vocabApi.createMany(inputs),
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: VOCAB_KEY,
    }),
  });
}

export function useDeleteVocab() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => vocabApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: VOCAB_KEY,
    }),
  });
}

import type { CreateSentenceInput } from "@sentence-bank/types";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { sentencesApi } from "../lib/api";

const SENTENCES_KEY = ["sentences"] as const;

export function useSentences() {
  return useQuery({
    queryKey: SENTENCES_KEY,
    queryFn: sentencesApi.list,
  });
}

export function useCreateSentence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSentenceInput) => sentencesApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: SENTENCES_KEY,
    }),
  });
}

export function useDeleteSentence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sentencesApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: SENTENCES_KEY,
    }),
  });
}

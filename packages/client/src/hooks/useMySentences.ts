import type { CreateMySentenceInput, UpdateMySentenceInput } from "@sentence-bank/types";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { mySentencesApi } from "../lib/api";

const MY_SENTENCES_KEY = ["my-sentences"] as const;

function useMySentenceInvalidator() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({
      queryKey: MY_SENTENCES_KEY,
    });
  };
}

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
    queryFn: () => mySentencesApi.list(practiceSentenceId),
  });
}

export function useCreateMySentence() {
  const invalidate = useMySentenceInvalidator();
  return useMutation({
    mutationFn: (input: CreateMySentenceInput) => mySentencesApi.create(input),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't save your sentence", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

/** Bulk-create many my-sentences from pasted content in a single request. */
export function useCreateMySentencesMany() {
  const invalidate = useMySentenceInvalidator();
  return useMutation({
    mutationFn: (inputs: CreateMySentenceInput[]) => mySentencesApi.createMany(inputs),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't import your sentences", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useUpdateMySentence() {
  const invalidate = useMySentenceInvalidator();
  return useMutation({
    mutationFn: ({
      id, input,
    }: { id: string;
      input: UpdateMySentenceInput; }) =>
      mySentencesApi.update(id, input),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't update your sentence", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useDeleteMySentence() {
  const invalidate = useMySentenceInvalidator();
  return useMutation({
    mutationFn: (id: string) => mySentencesApi.remove(id),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't delete your sentence", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

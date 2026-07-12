import type {
  CreatePracticeSentenceInput,
  UpdatePracticeSentenceInput,
} from "@sentence-bank/types";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { practiceSentencesApi } from "../lib/api";

const PRACTICE_KEY = ["practice-sentences"] as const;

function usePracticeSentenceInvalidator() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({
      queryKey: PRACTICE_KEY,
    });
  };
}

export function usePracticeSentences() {
  return useQuery({
    queryKey: PRACTICE_KEY,
    queryFn: practiceSentencesApi.list,
  });
}

export function usePracticeSentence(id: string) {
  return useQuery({
    queryKey: [...PRACTICE_KEY, id],
    queryFn: () => practiceSentencesApi.get(id),
  });
}

/** The bank vocab linked to a practice sentence (words the learner couldn't read). */
export function usePracticeSentenceVocab(id: string) {
  return useQuery({
    queryKey: [...PRACTICE_KEY, id, "vocab"],
    queryFn: () => practiceSentencesApi.getVocab(id),
  });
}

/** Replace the full set of vocab linked to a practice sentence. */
export function useSetPracticeSentenceVocab() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id, vocabIds,
    }: { id: string;
      vocabIds: string[]; }) =>
      practiceSentencesApi.setVocab(id, vocabIds),
    onSuccess: (_data, {
      id,
    }) => {
      queryClient.invalidateQueries({
        queryKey: [...PRACTICE_KEY, id, "vocab"],
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

export function useCreatePracticeSentence() {
  const invalidate = usePracticeSentenceInvalidator();
  return useMutation({
    mutationFn: (input: CreatePracticeSentenceInput) => practiceSentencesApi.create(input),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't save practice sentence", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useCreatePracticeSentencesMany() {
  const invalidate = usePracticeSentenceInvalidator();
  return useMutation({
    mutationFn: (inputs: CreatePracticeSentenceInput[]) => practiceSentencesApi.createMany(inputs),
    onSuccess: (created) => {
      invalidate();
      toast.success(
        created.length === 1
          ? "Imported 1 practice sentence"
          : `Imported ${created.length} practice sentences`,
      );
    },
    onError: err => toast.error("Couldn't import practice sentences", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useUpdatePracticeSentence() {
  const invalidate = usePracticeSentenceInvalidator();
  return useMutation({
    mutationFn: ({
      id, input,
    }: { id: string;
      input: UpdatePracticeSentenceInput; }) =>
      practiceSentencesApi.update(id, input),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't update practice sentence", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useDeletePracticeSentence() {
  const invalidate = usePracticeSentenceInvalidator();
  return useMutation({
    mutationFn: (id: string) => practiceSentencesApi.remove(id),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't delete practice sentence", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

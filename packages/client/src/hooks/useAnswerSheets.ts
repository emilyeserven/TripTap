import type { CreateAnswerSheetInput, UpdateAnswerSheetInput } from "@sentence-bank/types";

import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { useEntityCacheSync } from "./useEntityCacheSync";
import { answerSheetsApi } from "../lib/api";

const ANSWER_SHEETS_KEY = ["answer-sheets"] as const;

export function useAnswerSheets() {
  return useQuery({
    queryKey: ANSWER_SHEETS_KEY,
    queryFn: () => answerSheetsApi.list(),
  });
}

/** A single answer sheet by id (for its view / edit pages). */
export function useAnswerSheet(id: string) {
  return useQuery({
    queryKey: [...ANSWER_SHEETS_KEY, id],
    queryFn: () => answerSheetsApi.get(id),
  });
}

/** The answer sheets filled in against a given question sheet (0 or more). */
export function useAnswerSheetsForQuestionSheet(questionSheetId: string) {
  return useQuery({
    queryKey: [...ANSWER_SHEETS_KEY, "for-question-sheet", questionSheetId],
    queryFn: () => answerSheetsApi.list({
      questionSheetId,
    }),
  });
}

export function useCreateAnswerSheet() {
  const {
    seed,
  } = useEntityCacheSync(ANSWER_SHEETS_KEY);
  return useMutation({
    mutationFn: (input: CreateAnswerSheetInput) => answerSheetsApi.create(input),
    onSuccess: seed,
    onError: err => toast.error("Couldn't save the answer sheet", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useUpdateAnswerSheet() {
  const {
    seed,
  } = useEntityCacheSync(ANSWER_SHEETS_KEY);
  return useMutation({
    mutationFn: ({
      id, input,
    }: { id: string;
      input: UpdateAnswerSheetInput; }) =>
      answerSheetsApi.update(id, input),
    onSuccess: seed,
    onError: err => toast.error("Couldn't update the answer sheet", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useDeleteAnswerSheet() {
  const {
    invalidate,
  } = useEntityCacheSync(ANSWER_SHEETS_KEY);
  return useMutation({
    mutationFn: (id: string) => answerSheetsApi.remove(id),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't delete the answer sheet", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

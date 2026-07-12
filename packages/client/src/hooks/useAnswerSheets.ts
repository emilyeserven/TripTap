import type { CreateAnswerSheetInput, UpdateAnswerSheetInput } from "@sentence-bank/types";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { answerSheetsApi } from "../lib/api";

const ANSWER_SHEETS_KEY = ["answer-sheets"] as const;

function useAnswerSheetInvalidator() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({
      queryKey: ANSWER_SHEETS_KEY,
    });
  };
}

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

export function useCreateAnswerSheet() {
  const invalidate = useAnswerSheetInvalidator();
  return useMutation({
    mutationFn: (input: CreateAnswerSheetInput) => answerSheetsApi.create(input),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't save the answer sheet", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useUpdateAnswerSheet() {
  const invalidate = useAnswerSheetInvalidator();
  return useMutation({
    mutationFn: ({
      id, input,
    }: { id: string;
      input: UpdateAnswerSheetInput; }) =>
      answerSheetsApi.update(id, input),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't update the answer sheet", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useDeleteAnswerSheet() {
  const invalidate = useAnswerSheetInvalidator();
  return useMutation({
    mutationFn: (id: string) => answerSheetsApi.remove(id),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't delete the answer sheet", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

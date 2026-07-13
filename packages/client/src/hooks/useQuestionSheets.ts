import type { CreateQuestionSheetInput, UpdateQuestionSheetInput } from "@sentence-bank/types";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { questionSheetsApi } from "../lib/api";

const QUESTION_SHEETS_KEY = ["question-sheets"] as const;

function useQuestionSheetInvalidator() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({
      queryKey: QUESTION_SHEETS_KEY,
    });
  };
}

export function useQuestionSheets() {
  return useQuery({
    queryKey: QUESTION_SHEETS_KEY,
    queryFn: () => questionSheetsApi.list(),
  });
}

/** A single question sheet by id (for its view / edit pages). */
export function useQuestionSheet(id: string) {
  return useQuery({
    queryKey: [...QUESTION_SHEETS_KEY, id],
    queryFn: () => questionSheetsApi.get(id),
  });
}

export function useCreateQuestionSheet() {
  const invalidate = useQuestionSheetInvalidator();
  return useMutation({
    mutationFn: (input: CreateQuestionSheetInput) => questionSheetsApi.create(input),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't save the question sheet", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useUpdateQuestionSheet() {
  const invalidate = useQuestionSheetInvalidator();
  return useMutation({
    mutationFn: ({
      id, input,
    }: { id: string;
      input: UpdateQuestionSheetInput; }) =>
      questionSheetsApi.update(id, input),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't update the question sheet", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useDeleteQuestionSheet() {
  const invalidate = useQuestionSheetInvalidator();
  return useMutation({
    mutationFn: (id: string) => questionSheetsApi.remove(id),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't delete the question sheet", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

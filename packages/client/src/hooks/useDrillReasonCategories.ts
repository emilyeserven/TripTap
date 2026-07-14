import type {
  CreateDrillReasonCategoryInput,
  UpdateDrillReasonCategoryInput,
} from "@sentence-bank/types";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { drillReasonCategoriesApi } from "../lib/api";

const DRILL_REASON_CATEGORIES_KEY = ["drill-reason-categories"] as const;

function useDrillReasonCategoryInvalidator() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({
      queryKey: DRILL_REASON_CATEGORIES_KEY,
    });
  };
}

export function useDrillReasonCategories() {
  return useQuery({
    queryKey: DRILL_REASON_CATEGORIES_KEY,
    queryFn: () => drillReasonCategoriesApi.list(),
  });
}

export function useCreateDrillReasonCategory() {
  const invalidate = useDrillReasonCategoryInvalidator();
  return useMutation({
    mutationFn: (input: CreateDrillReasonCategoryInput) => drillReasonCategoriesApi.create(input),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't save the reason category", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useUpdateDrillReasonCategory() {
  const invalidate = useDrillReasonCategoryInvalidator();
  return useMutation({
    mutationFn: ({
      id, input,
    }: { id: string;
      input: UpdateDrillReasonCategoryInput; }) =>
      drillReasonCategoriesApi.update(id, input),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't update the reason category", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useDeleteDrillReasonCategory() {
  const invalidate = useDrillReasonCategoryInvalidator();
  return useMutation({
    mutationFn: (id: string) => drillReasonCategoriesApi.remove(id),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't delete the reason category", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

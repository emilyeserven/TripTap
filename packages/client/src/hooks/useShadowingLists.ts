import type { CreateShadowingListInput, UpdateShadowingListInput } from "@sentence-bank/types";

import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { useEntityCacheSync } from "./useEntityCacheSync";
import { shadowingListsApi } from "../lib/api";

const SHADOWING_LISTS_KEY = ["shadowing-lists"] as const;

export function useShadowingLists() {
  return useQuery({
    queryKey: SHADOWING_LISTS_KEY,
    queryFn: () => shadowingListsApi.list(),
  });
}

/** A single shadowing list by id (for its view / edit pages). */
export function useShadowingList(id: string) {
  return useQuery({
    queryKey: [...SHADOWING_LISTS_KEY, id],
    queryFn: () => shadowingListsApi.get(id),
  });
}

export function useCreateShadowingList() {
  const {
    seed,
  } = useEntityCacheSync(SHADOWING_LISTS_KEY);
  return useMutation({
    mutationFn: (input: CreateShadowingListInput) => shadowingListsApi.create(input),
    onSuccess: seed,
    onError: err => toast.error("Couldn't save the shadowing list", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useUpdateShadowingList() {
  const {
    seed,
  } = useEntityCacheSync(SHADOWING_LISTS_KEY);
  return useMutation({
    mutationFn: ({
      id, input,
    }: { id: string;
      input: UpdateShadowingListInput; }) =>
      shadowingListsApi.update(id, input),
    onSuccess: seed,
    onError: err => toast.error("Couldn't update the shadowing list", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useDeleteShadowingList() {
  const {
    invalidate,
  } = useEntityCacheSync(SHADOWING_LISTS_KEY);
  return useMutation({
    mutationFn: (id: string) => shadowingListsApi.remove(id),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't delete the shadowing list", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

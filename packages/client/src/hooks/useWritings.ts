import type { CreateWritingInput, UpdateWritingInput } from "@sentence-bank/types";

import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { useEntityCacheSync } from "./useEntityCacheSync";
import { writingsApi } from "../lib/api";

const WRITINGS_KEY = ["writings"] as const;

export function useWritings() {
  return useQuery({
    queryKey: WRITINGS_KEY,
    queryFn: () => writingsApi.list(),
  });
}

export function useWriting(id: string) {
  return useQuery({
    queryKey: [...WRITINGS_KEY, id],
    queryFn: () => writingsApi.get(id),
  });
}

export function useCreateWriting() {
  const {
    seed,
  } = useEntityCacheSync(WRITINGS_KEY);
  return useMutation({
    mutationFn: (input: CreateWritingInput) => writingsApi.create(input),
    onSuccess: seed,
    onError: err => toast.error("Couldn't create your writing", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useUpdateWriting() {
  const {
    seed,
  } = useEntityCacheSync(WRITINGS_KEY);
  return useMutation({
    mutationFn: ({
      id, input,
    }: { id: string;
      input: UpdateWritingInput; }) =>
      writingsApi.update(id, input),
    onSuccess: seed,
    onError: err => toast.error("Couldn't save your writing", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useDeleteWriting() {
  const {
    invalidate,
  } = useEntityCacheSync(WRITINGS_KEY);
  return useMutation({
    mutationFn: (id: string) => writingsApi.remove(id),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't delete your writing", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

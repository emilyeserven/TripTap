import type { CreateWritingInput, UpdateWritingInput } from "@sentence-bank/types";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { writingsApi } from "../lib/api";

const WRITINGS_KEY = ["writings"] as const;

function useWritingInvalidator() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({
      queryKey: WRITINGS_KEY,
    });
  };
}

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
  const invalidate = useWritingInvalidator();
  return useMutation({
    mutationFn: (input: CreateWritingInput) => writingsApi.create(input),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't create your writing", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useUpdateWriting() {
  const invalidate = useWritingInvalidator();
  return useMutation({
    mutationFn: ({
      id, input,
    }: { id: string;
      input: UpdateWritingInput; }) =>
      writingsApi.update(id, input),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't save your writing", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useDeleteWriting() {
  const invalidate = useWritingInvalidator();
  return useMutation({
    mutationFn: (id: string) => writingsApi.remove(id),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't delete your writing", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

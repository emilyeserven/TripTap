import type { CreateTheorySessionInput, UpdateTheorySessionInput } from "@sentence-bank/types";

import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { useEntityCacheSync } from "./useEntityCacheSync";
import { theorySessionsApi } from "../lib/api";

const THEORY_SESSIONS_KEY = ["theory-sessions"] as const;

export function useTheorySessions() {
  return useQuery({
    queryKey: THEORY_SESSIONS_KEY,
    queryFn: () => theorySessionsApi.list(),
  });
}

/** A single theory session by id (for its view / edit pages). */
export function useTheorySession(id: string) {
  return useQuery({
    queryKey: [...THEORY_SESSIONS_KEY, id],
    queryFn: () => theorySessionsApi.get(id),
  });
}

export function useCreateTheorySession() {
  const {
    seed,
  } = useEntityCacheSync(THEORY_SESSIONS_KEY);
  return useMutation({
    mutationFn: (input: CreateTheorySessionInput) => theorySessionsApi.create(input),
    onSuccess: seed,
    onError: err => toast.error("Couldn't save the theory session", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useUpdateTheorySession() {
  const {
    seed,
  } = useEntityCacheSync(THEORY_SESSIONS_KEY);
  return useMutation({
    mutationFn: ({
      id, input,
    }: { id: string;
      input: UpdateTheorySessionInput; }) =>
      theorySessionsApi.update(id, input),
    onSuccess: seed,
    onError: err => toast.error("Couldn't update the theory session", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useDeleteTheorySession() {
  const {
    invalidate,
  } = useEntityCacheSync(THEORY_SESSIONS_KEY);
  return useMutation({
    mutationFn: (id: string) => theorySessionsApi.remove(id),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't delete the theory session", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

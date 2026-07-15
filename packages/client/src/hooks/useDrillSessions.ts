import type { CreateDrillSessionInput, UpdateDrillSessionInput } from "@sentence-bank/types";

import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { useEntityCacheSync } from "./useEntityCacheSync";
import { drillSessionsApi } from "../lib/api";

const DRILL_SESSIONS_KEY = ["drill-sessions"] as const;

export function useDrillSessions() {
  return useQuery({
    queryKey: DRILL_SESSIONS_KEY,
    queryFn: () => drillSessionsApi.list(),
  });
}

/** A single drill session by id (for its view / edit pages). */
export function useDrillSession(id: string) {
  return useQuery({
    queryKey: [...DRILL_SESSIONS_KEY, id],
    queryFn: () => drillSessionsApi.get(id),
  });
}

export function useCreateDrillSession() {
  const {
    seed,
  } = useEntityCacheSync(DRILL_SESSIONS_KEY);
  return useMutation({
    mutationFn: (input: CreateDrillSessionInput) => drillSessionsApi.create(input),
    onSuccess: seed,
    onError: err => toast.error("Couldn't save the drill session", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useUpdateDrillSession() {
  const {
    seed,
  } = useEntityCacheSync(DRILL_SESSIONS_KEY);
  return useMutation({
    mutationFn: ({
      id, input,
    }: { id: string;
      input: UpdateDrillSessionInput; }) =>
      drillSessionsApi.update(id, input),
    onSuccess: seed,
    onError: err => toast.error("Couldn't update the drill session", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useDeleteDrillSession() {
  const {
    invalidate,
  } = useEntityCacheSync(DRILL_SESSIONS_KEY);
  return useMutation({
    mutationFn: (id: string) => drillSessionsApi.remove(id),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't delete the drill session", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

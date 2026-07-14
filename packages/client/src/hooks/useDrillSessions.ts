import type { CreateDrillSessionInput, UpdateDrillSessionInput } from "@sentence-bank/types";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { drillSessionsApi } from "../lib/api";

const DRILL_SESSIONS_KEY = ["drill-sessions"] as const;

function useDrillSessionInvalidator() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({
      queryKey: DRILL_SESSIONS_KEY,
    });
  };
}

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
  const invalidate = useDrillSessionInvalidator();
  return useMutation({
    mutationFn: (input: CreateDrillSessionInput) => drillSessionsApi.create(input),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't save the drill session", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useUpdateDrillSession() {
  const invalidate = useDrillSessionInvalidator();
  return useMutation({
    mutationFn: ({
      id, input,
    }: { id: string;
      input: UpdateDrillSessionInput; }) =>
      drillSessionsApi.update(id, input),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't update the drill session", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useDeleteDrillSession() {
  const invalidate = useDrillSessionInvalidator();
  return useMutation({
    mutationFn: (id: string) => drillSessionsApi.remove(id),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't delete the drill session", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

import type {
  CreateShadowingSessionInput,
  UpdateShadowingSessionInput,
} from "@sentence-bank/types";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { shadowingSessionsApi } from "../lib/api";

const SHADOWING_SESSIONS_KEY = ["shadowing-sessions"] as const;

function useShadowingSessionInvalidator() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({
      queryKey: SHADOWING_SESSIONS_KEY,
    });
  };
}

export function useShadowingSessions() {
  return useQuery({
    queryKey: SHADOWING_SESSIONS_KEY,
    queryFn: () => shadowingSessionsApi.list(),
  });
}

export function useShadowingSession(id: string) {
  return useQuery({
    queryKey: [...SHADOWING_SESSIONS_KEY, id],
    queryFn: () => shadowingSessionsApi.get(id),
  });
}

export function useCreateShadowingSession() {
  const invalidate = useShadowingSessionInvalidator();
  return useMutation({
    mutationFn: (input: CreateShadowingSessionInput) => shadowingSessionsApi.create(input),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't create the shadowing session", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useUpdateShadowingSession() {
  const invalidate = useShadowingSessionInvalidator();
  return useMutation({
    mutationFn: ({
      id, input,
    }: { id: string;
      input: UpdateShadowingSessionInput; }) =>
      shadowingSessionsApi.update(id, input),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't save the shadowing session", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useDeleteShadowingSession() {
  const invalidate = useShadowingSessionInvalidator();
  return useMutation({
    mutationFn: (id: string) => shadowingSessionsApi.remove(id),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't delete the shadowing session", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

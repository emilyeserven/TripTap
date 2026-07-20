import type {
  CreateShadowingSessionInput,
  UpdateShadowingSessionInput,
} from "@sentence-bank/types";

import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { useEntityCacheSync } from "./useEntityCacheSync";
import { shadowingSessionsApi } from "../lib/api";

const SHADOWING_SESSIONS_KEY = ["shadowing-sessions"] as const;

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
  const {
    seed,
  } = useEntityCacheSync(SHADOWING_SESSIONS_KEY);
  return useMutation({
    mutationFn: (input: CreateShadowingSessionInput) => shadowingSessionsApi.create(input),
    onSuccess: seed,
    onError: err => toast.error("Couldn't create the shadowing session", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useUpdateShadowingSession() {
  const {
    seed,
  } = useEntityCacheSync(SHADOWING_SESSIONS_KEY);
  return useMutation({
    mutationFn: ({
      id, input,
    }: { id: string;
      input: UpdateShadowingSessionInput; }) =>
      shadowingSessionsApi.update(id, input),
    onSuccess: seed,
    onError: err => toast.error("Couldn't save the shadowing session", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useUploadShadowingSessionAudio() {
  const {
    seed,
  } = useEntityCacheSync(SHADOWING_SESSIONS_KEY);
  return useMutation({
    mutationFn: ({
      id, file,
    }: { id: string;
      file: File; }) => shadowingSessionsApi.uploadAudio(id, file),
    onSuccess: seed,
    onError: err => toast.error("Couldn't upload the audio", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useDeleteShadowingSession() {
  const {
    invalidate,
  } = useEntityCacheSync(SHADOWING_SESSIONS_KEY);
  return useMutation({
    mutationFn: (id: string) => shadowingSessionsApi.remove(id),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't delete the shadowing session", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

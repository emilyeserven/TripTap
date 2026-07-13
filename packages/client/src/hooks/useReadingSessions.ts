import type {
  CreateReadingSessionInput,
  UpdateReadingSessionInput,
} from "@sentence-bank/types";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { readingSessionsApi } from "../lib/api";

const READING_SESSIONS_KEY = ["reading-sessions"] as const;

function useReadingSessionInvalidator() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({
      queryKey: READING_SESSIONS_KEY,
    });
  };
}

export function useReadingSessions() {
  return useQuery({
    queryKey: READING_SESSIONS_KEY,
    queryFn: () => readingSessionsApi.list(),
  });
}

export function useReadingSession(id: string) {
  return useQuery({
    queryKey: [...READING_SESSIONS_KEY, id],
    queryFn: () => readingSessionsApi.get(id),
  });
}

export function useCreateReadingSession() {
  const invalidate = useReadingSessionInvalidator();
  return useMutation({
    mutationFn: (input: CreateReadingSessionInput) => readingSessionsApi.create(input),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't create the reading session", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useUpdateReadingSession() {
  const invalidate = useReadingSessionInvalidator();
  return useMutation({
    mutationFn: ({
      id, input,
    }: { id: string;
      input: UpdateReadingSessionInput; }) =>
      readingSessionsApi.update(id, input),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't save the reading session", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useDeleteReadingSession() {
  const invalidate = useReadingSessionInvalidator();
  return useMutation({
    mutationFn: (id: string) => readingSessionsApi.remove(id),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't delete the reading session", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

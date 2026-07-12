import type {
  CreateListeningSessionInput,
  UpdateListeningSessionInput,
} from "@sentence-bank/types";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { listeningSessionsApi } from "../lib/api";

const LISTENING_SESSIONS_KEY = ["listening-sessions"] as const;

function useListeningSessionInvalidator() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({
      queryKey: LISTENING_SESSIONS_KEY,
    });
  };
}

export function useListeningSessions() {
  return useQuery({
    queryKey: LISTENING_SESSIONS_KEY,
    queryFn: () => listeningSessionsApi.list(),
  });
}

export function useListeningSession(id: string) {
  return useQuery({
    queryKey: [...LISTENING_SESSIONS_KEY, id],
    queryFn: () => listeningSessionsApi.get(id),
  });
}

export function useCreateListeningSession() {
  const invalidate = useListeningSessionInvalidator();
  return useMutation({
    mutationFn: (input: CreateListeningSessionInput) => listeningSessionsApi.create(input),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't create the listening session", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useUpdateListeningSession() {
  const invalidate = useListeningSessionInvalidator();
  return useMutation({
    mutationFn: ({
      id, input,
    }: { id: string;
      input: UpdateListeningSessionInput; }) =>
      listeningSessionsApi.update(id, input),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't save the listening session", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useDeleteListeningSession() {
  const invalidate = useListeningSessionInvalidator();
  return useMutation({
    mutationFn: (id: string) => listeningSessionsApi.remove(id),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't delete the listening session", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

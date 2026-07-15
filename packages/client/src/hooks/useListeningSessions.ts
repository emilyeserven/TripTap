import type {
  CreateListeningSessionInput,
  UpdateListeningSessionInput,
} from "@sentence-bank/types";

import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { useEntityCacheSync } from "./useEntityCacheSync";
import { listeningSessionsApi } from "../lib/api";

const LISTENING_SESSIONS_KEY = ["listening-sessions"] as const;

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
  const {
    seed,
  } = useEntityCacheSync(LISTENING_SESSIONS_KEY);
  return useMutation({
    mutationFn: (input: CreateListeningSessionInput) => listeningSessionsApi.create(input),
    onSuccess: seed,
    onError: err => toast.error("Couldn't create the listening session", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useUpdateListeningSession() {
  const {
    seed,
  } = useEntityCacheSync(LISTENING_SESSIONS_KEY);
  return useMutation({
    mutationFn: ({
      id, input,
    }: { id: string;
      input: UpdateListeningSessionInput; }) =>
      listeningSessionsApi.update(id, input),
    onSuccess: seed,
    onError: err => toast.error("Couldn't save the listening session", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useDeleteListeningSession() {
  const {
    invalidate,
  } = useEntityCacheSync(LISTENING_SESSIONS_KEY);
  return useMutation({
    mutationFn: (id: string) => listeningSessionsApi.remove(id),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't delete the listening session", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

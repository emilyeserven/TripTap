import type { CreateTutorInput, UpdateTutorInput } from "@sentence-bank/types";

import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { useEntityCacheSync } from "./useEntityCacheSync";
import { tutorsApi } from "../lib/api";

const TUTORS_KEY = ["tutors"] as const;

export function useTutors() {
  return useQuery({
    queryKey: TUTORS_KEY,
    queryFn: () => tutorsApi.list(),
  });
}

/** A single tutor by id (for its view / edit pages). */
export function useTutor(id: string) {
  return useQuery({
    queryKey: [...TUTORS_KEY, id],
    queryFn: () => tutorsApi.get(id),
  });
}

export function useCreateTutor() {
  const {
    seed,
  } = useEntityCacheSync(TUTORS_KEY);
  return useMutation({
    mutationFn: (input: CreateTutorInput) => tutorsApi.create(input),
    onSuccess: seed,
    onError: err => toast.error("Couldn't save the tutor", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useUpdateTutor() {
  const {
    seed,
  } = useEntityCacheSync(TUTORS_KEY);
  return useMutation({
    mutationFn: ({
      id, input,
    }: { id: string;
      input: UpdateTutorInput; }) =>
      tutorsApi.update(id, input),
    onSuccess: seed,
    onError: err => toast.error("Couldn't update the tutor", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useDeleteTutor() {
  const {
    invalidate,
  } = useEntityCacheSync(TUTORS_KEY);
  return useMutation({
    mutationFn: (id: string) => tutorsApi.remove(id),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't delete the tutor", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

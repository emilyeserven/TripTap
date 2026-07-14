import type { CreateTutorInput, UpdateTutorInput } from "@sentence-bank/types";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { tutorsApi } from "../lib/api";

const TUTORS_KEY = ["tutors"] as const;

function useTutorInvalidator() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({
      queryKey: TUTORS_KEY,
    });
  };
}

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
  const invalidate = useTutorInvalidator();
  return useMutation({
    mutationFn: (input: CreateTutorInput) => tutorsApi.create(input),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't save the tutor", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useUpdateTutor() {
  const invalidate = useTutorInvalidator();
  return useMutation({
    mutationFn: ({
      id, input,
    }: { id: string;
      input: UpdateTutorInput; }) =>
      tutorsApi.update(id, input),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't update the tutor", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useDeleteTutor() {
  const invalidate = useTutorInvalidator();
  return useMutation({
    mutationFn: (id: string) => tutorsApi.remove(id),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't delete the tutor", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

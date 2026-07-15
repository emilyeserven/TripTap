import type { CreateLessonInput, UpdateLessonInput } from "@sentence-bank/types";

import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { useEntityCacheSync } from "./useEntityCacheSync";
import { lessonsApi } from "../lib/api";

const LESSONS_KEY = ["lessons"] as const;

/** All lessons, optionally scoped to a single tutor. */
export function useLessons(tutorId?: string) {
  return useQuery({
    queryKey: [...LESSONS_KEY, {
      tutorId: tutorId ?? null,
    }],
    queryFn: () => lessonsApi.list(tutorId),
  });
}

/** A single lesson by id (for its view / edit pages). */
export function useLesson(id: string) {
  return useQuery({
    queryKey: [...LESSONS_KEY, id],
    queryFn: () => lessonsApi.get(id),
  });
}

export function useCreateLesson() {
  const {
    seed,
  } = useEntityCacheSync(LESSONS_KEY);
  return useMutation({
    mutationFn: (input: CreateLessonInput) => lessonsApi.create(input),
    onSuccess: seed,
    onError: err => toast.error("Couldn't save the lesson", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useUpdateLesson() {
  const {
    seed,
  } = useEntityCacheSync(LESSONS_KEY);
  return useMutation({
    mutationFn: ({
      id, input,
    }: { id: string;
      input: UpdateLessonInput; }) =>
      lessonsApi.update(id, input),
    onSuccess: seed,
    onError: err => toast.error("Couldn't update the lesson", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useDeleteLesson() {
  const {
    invalidate,
  } = useEntityCacheSync(LESSONS_KEY);
  return useMutation({
    mutationFn: (id: string) => lessonsApi.remove(id),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't delete the lesson", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

import type { LessonImportInput, VocabRenshuuUpdate } from "@sentence-bank/types";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { lessonsApi } from "../lib/api";

const LESSONS_KEY = ["lessons"] as const;

export function useLessons() {
  return useQuery({
    queryKey: LESSONS_KEY,
    queryFn: lessonsApi.list,
  });
}

export function useLesson(slug: string) {
  return useQuery({
    queryKey: [...LESSONS_KEY, slug],
    queryFn: () => lessonsApi.getBySlug(slug),
  });
}

export function useLessonContent() {
  return useQuery({
    queryKey: ["lesson-content"],
    queryFn: lessonsApi.content,
  });
}

export function useImportLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LessonImportInput) => lessonsApi.import(input),
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: LESSONS_KEY,
    }),
  });
}

export function useDeleteLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => lessonsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: LESSONS_KEY,
    }),
  });
}

export function useUpdateVocabRenshuu() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id, patch,
    }: { id: string;
      patch: VocabRenshuuUpdate; }) =>
      lessonsApi.updateVocab(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["lesson-content"],
      });
      queryClient.invalidateQueries({
        queryKey: LESSONS_KEY,
      });
    },
  });
}

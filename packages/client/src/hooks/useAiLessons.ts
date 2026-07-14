import type { AiLessonImportInput, SentenceTermRef, VocabRenshuuUpdate } from "@sentence-bank/types";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { aiLessonsApi } from "../lib/api";

const AI_LESSONS_KEY = ["ai-lessons"] as const;

export function useAiLessons() {
  return useQuery({
    queryKey: AI_LESSONS_KEY,
    queryFn: aiLessonsApi.list,
  });
}

export function useAiLesson(slug: string) {
  return useQuery({
    queryKey: [...AI_LESSONS_KEY, slug],
    queryFn: () => aiLessonsApi.getBySlug(slug),
  });
}

export function useAiLessonContent() {
  return useQuery({
    queryKey: ["ai-lesson-content"],
    queryFn: aiLessonsApi.content,
  });
}

export function useImportAiLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AiLessonImportInput) => aiLessonsApi.import(input),
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: AI_LESSONS_KEY,
    }),
  });
}

export function useDeleteAiLesson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => aiLessonsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: AI_LESSONS_KEY,
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
      aiLessonsApi.updateVocab(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["ai-lesson-content"],
      });
      queryClient.invalidateQueries({
        queryKey: AI_LESSONS_KEY,
      });
    },
  });
}

export function useUpdateAiLessonGrammarTerms() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id, grammarTerms,
    }: { id: string;
      grammarTerms: SentenceTermRef[] | null; }) =>
      aiLessonsApi.updateGrammarTerms(id, grammarTerms),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["ai-lesson-content"],
      });
      queryClient.invalidateQueries({
        queryKey: AI_LESSONS_KEY,
      });
    },
  });
}

export function useUpdateSourceSentenceTerms() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id, grammarTerms,
    }: { id: string;
      grammarTerms: SentenceTermRef[] | null; }) =>
      aiLessonsApi.updateSourceSentenceTerms(id, grammarTerms),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["ai-lesson-content"],
      });
      queryClient.invalidateQueries({
        queryKey: AI_LESSONS_KEY,
      });
    },
  });
}

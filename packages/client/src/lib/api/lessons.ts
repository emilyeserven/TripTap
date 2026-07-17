/** Lesson APIs: tutor lessons, tutors, and AI lessons. */
import type {
  GrammarItem,
  AiLessonContent,
  AiLessonDetail,
  AiLessonImportInput,
  AiLessonSummary,
  SentenceTermRef,
  SourceSentenceItem,
  VocabItem,
  VocabRenshuuUpdate,
  Tutor,
  CreateTutorInput,
  UpdateTutorInput,
  Lesson,
  CreateLessonInput,
  UpdateLessonInput,
} from "@sentence-bank/types";

import { request } from "./request";

export const lessonsApi = {
  list: (tutorId?: string) =>
    request<Lesson[]>(tutorId ? `/lessons?tutorId=${tutorId}` : "/lessons"),
  get: (id: string) => request<Lesson>(`/lessons/${id}`),
  create: (input: CreateLessonInput) =>
    request<Lesson>("/lessons", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (id: string, input: UpdateLessonInput) =>
    request<Lesson>(`/lessons/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  remove: (id: string) => request<undefined>(`/lessons/${id}`, {
    method: "DELETE",
  }),
};

export const tutorsApi = {
  list: () => request<Tutor[]>("/tutors"),
  get: (id: string) => request<Tutor>(`/tutors/${id}`),
  create: (input: CreateTutorInput) =>
    request<Tutor>("/tutors", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (id: string, input: UpdateTutorInput) =>
    request<Tutor>(`/tutors/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  remove: (id: string) => request<undefined>(`/tutors/${id}`, {
    method: "DELETE",
  }),
};

export const aiLessonsApi = {
  list: () => request<AiLessonSummary[]>("/ai-lessons"),
  content: () => request<AiLessonContent>("/ai-lesson-content"),
  getBySlug: (slug: string) => request<AiLessonDetail>(`/ai-lessons/${slug}`),
  import: (input: AiLessonImportInput) =>
    request<AiLessonDetail>("/ai-lessons/import", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  remove: (id: string) => request<undefined>(`/ai-lessons/${id}`, {
    method: "DELETE",
  }),
  updateVocab: (id: string, patch: VocabRenshuuUpdate) =>
    request<VocabItem>(`/ai-lesson-vocab/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
  updateGrammarTerms: (id: string, grammarTerms: SentenceTermRef[] | null) =>
    request<GrammarItem>(`/ai-lesson-grammar/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        grammarTerms,
      }),
    }),
  updateSourceSentenceTerms: (id: string, grammarTerms: SentenceTermRef[] | null) =>
    request<SourceSentenceItem>(`/ai-lesson-source-sentences/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        grammarTerms,
      }),
    }),
};

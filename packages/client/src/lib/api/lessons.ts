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

import { crudApi } from "./crud";
import { request } from "./request";

export const lessonsApi = {
  ...crudApi<Lesson, CreateLessonInput, UpdateLessonInput>("/lessons"),
  /** Optionally scoped to one tutor. */
  list: (tutorId?: string) =>
    request<Lesson[]>(tutorId ? `/lessons?tutorId=${tutorId}` : "/lessons"),
};

export const tutorsApi = crudApi<Tutor, CreateTutorInput, UpdateTutorInput>("/tutors");

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

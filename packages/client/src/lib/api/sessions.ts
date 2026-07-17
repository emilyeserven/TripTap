/** Study-session APIs: listening, reading, shadowing, and drill sessions + the reason taxonomy. */
import type {
  CreateListeningSessionInput,
  CreateReadingSessionInput,
  CreateShadowingSessionInput,
  ListeningSession,
  ReadingSession,
  ShadowingSession,
  UpdateListeningSessionInput,
  UpdateReadingSessionInput,
  UpdateShadowingSessionInput,
  DrillSession,
  CreateDrillSessionInput,
  UpdateDrillSessionInput,
  DrillReasonCategory,
  CreateDrillReasonCategoryInput,
  UpdateDrillReasonCategoryInput,
} from "@sentence-bank/types";

import { request } from "./request";

export const listeningSessionsApi = {
  list: () => request<ListeningSession[]>("/listening-sessions"),
  get: (id: string) => request<ListeningSession>(`/listening-sessions/${id}`),
  create: (input: CreateListeningSessionInput) =>
    request<ListeningSession>("/listening-sessions", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (id: string, input: UpdateListeningSessionInput) =>
    request<ListeningSession>(`/listening-sessions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  remove: (id: string) => request<undefined>(`/listening-sessions/${id}`, {
    method: "DELETE",
  }),
};

export const readingSessionsApi = {
  list: () => request<ReadingSession[]>("/reading-sessions"),
  get: (id: string) => request<ReadingSession>(`/reading-sessions/${id}`),
  create: (input: CreateReadingSessionInput) =>
    request<ReadingSession>("/reading-sessions", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (id: string, input: UpdateReadingSessionInput) =>
    request<ReadingSession>(`/reading-sessions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  remove: (id: string) => request<undefined>(`/reading-sessions/${id}`, {
    method: "DELETE",
  }),
};

export const shadowingSessionsApi = {
  list: () => request<ShadowingSession[]>("/shadowing-sessions"),
  get: (id: string) => request<ShadowingSession>(`/shadowing-sessions/${id}`),
  create: (input: CreateShadowingSessionInput) =>
    request<ShadowingSession>("/shadowing-sessions", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (id: string, input: UpdateShadowingSessionInput) =>
    request<ShadowingSession>(`/shadowing-sessions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  remove: (id: string) => request<undefined>(`/shadowing-sessions/${id}`, {
    method: "DELETE",
  }),
};

export const drillSessionsApi = {
  list: () => request<DrillSession[]>("/drill-sessions"),
  get: (id: string) => request<DrillSession>(`/drill-sessions/${id}`),
  create: (input: CreateDrillSessionInput) =>
    request<DrillSession>("/drill-sessions", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (id: string, input: UpdateDrillSessionInput) =>
    request<DrillSession>(`/drill-sessions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  remove: (id: string) => request<undefined>(`/drill-sessions/${id}`, {
    method: "DELETE",
  }),
};

export const drillReasonCategoriesApi = {
  list: () => request<DrillReasonCategory[]>("/drill-reason-categories"),
  get: (id: string) => request<DrillReasonCategory>(`/drill-reason-categories/${id}`),
  create: (input: CreateDrillReasonCategoryInput) =>
    request<DrillReasonCategory>("/drill-reason-categories", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (id: string, input: UpdateDrillReasonCategoryInput) =>
    request<DrillReasonCategory>(`/drill-reason-categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  remove: (id: string) => request<undefined>(`/drill-reason-categories/${id}`, {
    method: "DELETE",
  }),
};

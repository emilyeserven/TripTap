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

import { BASE, request } from "./request";

/** A caption-derived practice segment (no id yet — the client stamps `ShadowingSegment` ids). */
export interface CaptionSegment {
  startMs: number;
  endMs: number;
  label: string;
}

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
  /** Absolute path to the session's stored audio, for an `<audio>` element. */
  audioUrl: (id: string) => `${BASE}/shadowing-sessions/${id}/audio`,
  /** Multipart upload of the session's audio; bypasses `request()` so the browser sets the boundary. */
  uploadAudio: async (id: string, file: File): Promise<ShadowingSession> => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BASE}/shadowing-sessions/${id}/audio`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(body.message ?? `Request failed with ${res.status}`);
    }
    return (await res.json()) as ShadowingSession;
  },
  /** Derive practice segments from a YouTube video's captions. */
  fetchCaptionSegments: (videoUrl: string, lang?: string | null) => {
    const params = new URLSearchParams({
      videoUrl,
    });
    if (lang) params.set("lang", lang);
    return request<{ segments: CaptionSegment[] }>(`/shadowing-sessions/captions?${params.toString()}`);
  },
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

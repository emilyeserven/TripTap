/**
 * Study-session APIs: listening, reading, shadowing, dialogues, and drill sessions + the reason
 * taxonomy.
 */
import type {
  CreateDialogueInput,
  CreateListeningSessionInput,
  CreateReadingSessionInput,
  CreateShadowingSessionInput,
  Dialogue,
  ListeningSession,
  ReadingSession,
  ShadowingSession,
  UpdateDialogueInput,
  UpdateListeningSessionInput,
  UpdateReadingSessionInput,
  UpdateShadowingSessionInput,
  DrillSession,
  CreateDrillSessionInput,
  UpdateDrillSessionInput,
  DrillReasonCategory,
  CreateDrillReasonCategoryInput,
  UpdateDrillReasonCategoryInput,
  TheorySession,
  CreateTheorySessionInput,
  UpdateTheorySessionInput,
  ActivityDay,
  XpSummary,
} from "@sentence-bank/types";

import { crudApi } from "./crud";
import { BASE, request } from "./request";

/** A caption-derived practice segment (no id yet — the client stamps `ShadowingSegment` ids). */
export interface CaptionSegment {
  startMs: number;
  endMs: number;
  label: string;
}

export const listeningSessionsApi = crudApi<ListeningSession, CreateListeningSessionInput, UpdateListeningSessionInput>("/listening-sessions");

export const dialoguesApi = crudApi<Dialogue, CreateDialogueInput, UpdateDialogueInput>("/dialogues");

export const readingSessionsApi = crudApi<ReadingSession, CreateReadingSessionInput, UpdateReadingSessionInput>("/reading-sessions");

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

export const drillSessionsApi = crudApi<DrillSession, CreateDrillSessionInput, UpdateDrillSessionInput>("/drill-sessions");

export const theorySessionsApi = crudApi<TheorySession, CreateTheorySessionInput, UpdateTheorySessionInput>("/theory-sessions");

export const drillReasonCategoriesApi = crudApi<DrillReasonCategory, CreateDrillReasonCategoryInput, UpdateDrillReasonCategoryInput>("/drill-reason-categories");

export const xpApi = {
  summary: (days?: number) => {
    const params = new URLSearchParams();
    if (days != null) params.set("days", String(days));
    // "Today" is the caller's calendar day; the browser's offset tells the server where that falls.
    params.set("tzOffsetMinutes", String(new Date().getTimezoneOffset()));
    return request<XpSummary>(`/xp/summary?${params.toString()}`);
  },
};

export const activityApi = {
  list: (days?: number) => {
    const params = new URLSearchParams();
    if (days != null) params.set("days", String(days));
    // Group work by the caller's calendar day; the browser's offset tells the server where that falls.
    params.set("tzOffsetMinutes", String(new Date().getTimezoneOffset()));
    return request<ActivityDay[]>(`/activity?${params.toString()}`);
  },
};

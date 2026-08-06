import { createEntityHooks } from "./createEntityHooks";

import { readingSessionsApi } from "@/lib/api";

const hooks = createEntityHooks({
  key: ["reading-sessions"] as const,
  api: readingSessionsApi,
  label: "reading session",
});

export const useReadingSessions = hooks.useList;
/** A single reading session by id (for its view / edit pages). */
export const useReadingSession = hooks.useOne;
export const useCreateReadingSession = hooks.useCreate;
export const useUpdateReadingSession = hooks.useUpdate;
export const useDeleteReadingSession = hooks.useRemove;

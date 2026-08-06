import { createEntityHooks } from "./createEntityHooks";

import { listeningSessionsApi } from "@/lib/api";

const hooks = createEntityHooks({
  key: ["listening-sessions"] as const,
  api: listeningSessionsApi,
  label: "listening session",
});

export const useListeningSessions = hooks.useList;
/** A single listening session by id (for its view / edit pages). */
export const useListeningSession = hooks.useOne;
export const useCreateListeningSession = hooks.useCreate;
export const useUpdateListeningSession = hooks.useUpdate;
export const useDeleteListeningSession = hooks.useRemove;

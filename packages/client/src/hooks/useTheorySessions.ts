import { createEntityHooks } from "./createEntityHooks";

import { theorySessionsApi } from "@/lib/api";

const hooks = createEntityHooks({
  key: ["theory-sessions"] as const,
  api: theorySessionsApi,
  label: "theory session",
});

export const useTheorySessions = hooks.useList;
/** A single theory session by id (for its view / edit pages). */
export const useTheorySession = hooks.useOne;
export const useCreateTheorySession = hooks.useCreate;
export const useUpdateTheorySession = hooks.useUpdate;
export const useDeleteTheorySession = hooks.useRemove;

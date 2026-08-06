import { createEntityHooks } from "./createEntityHooks";

import { drillSessionsApi } from "@/lib/api";

const hooks = createEntityHooks({
  key: ["drill-sessions"] as const,
  api: drillSessionsApi,
  label: "drill session",
});

export const useDrillSessions = hooks.useList;
/** A single drill session by id (for its view / edit pages). */
export const useDrillSession = hooks.useOne;
export const useCreateDrillSession = hooks.useCreate;
export const useUpdateDrillSession = hooks.useUpdate;
export const useDeleteDrillSession = hooks.useRemove;

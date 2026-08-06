import { createEntityHooks } from "./createEntityHooks";

import { writingsApi } from "@/lib/api";

const hooks = createEntityHooks({
  key: ["writings"] as const,
  api: writingsApi,
  label: "writing",
});

export const useWritings = hooks.useList;
/** A single writing by id (for its view / edit pages). */
export const useWriting = hooks.useOne;
export const useCreateWriting = hooks.useCreate;
export const useUpdateWriting = hooks.useUpdate;
export const useDeleteWriting = hooks.useRemove;

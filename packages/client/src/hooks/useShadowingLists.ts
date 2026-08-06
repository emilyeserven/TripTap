import { createEntityHooks } from "./createEntityHooks";

import { shadowingListsApi } from "@/lib/api";

const hooks = createEntityHooks({
  key: ["shadowing-lists"] as const,
  api: shadowingListsApi,
  label: "shadowing list",
});

export const useShadowingLists = hooks.useList;
/** A single shadowing list by id (for its view / edit pages). */
export const useShadowingList = hooks.useOne;
export const useCreateShadowingList = hooks.useCreate;
export const useUpdateShadowingList = hooks.useUpdate;
export const useDeleteShadowingList = hooks.useRemove;

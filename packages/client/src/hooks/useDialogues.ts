import { createEntityHooks } from "./createEntityHooks";

import { dialoguesApi } from "@/lib/api";

const hooks = createEntityHooks({
  key: ["dialogues"] as const,
  api: dialoguesApi,
  label: "dialogue",
});

export const useDialogues = hooks.useList;
/** A single dialogue by id (for its view / edit pages). */
export const useDialogue = hooks.useOne;
export const useCreateDialogue = hooks.useCreate;
export const useUpdateDialogue = hooks.useUpdate;
export const useDeleteDialogue = hooks.useRemove;

import { createEntityHooks } from "./createEntityHooks";

import { cultureNotesApi } from "@/lib/api";

const hooks = createEntityHooks({
  key: ["culture-notes"] as const,
  api: cultureNotesApi,
  label: "culture note",
});

export const useCultureNotes = hooks.useList;
export const useCultureNote = hooks.useOne;
export const useCreateCultureNote = hooks.useCreate;
export const useUpdateCultureNote = hooks.useUpdate;
export const useDeleteCultureNote = hooks.useRemove;

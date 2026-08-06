import { createEntityHooks } from "./createEntityHooks";

import { tutorsApi } from "@/lib/api";

const hooks = createEntityHooks({
  key: ["tutors"] as const,
  api: tutorsApi,
  label: "tutor",
});

export const useTutors = hooks.useList;
/** A single tutor by id (for its view / edit pages). */
export const useTutor = hooks.useOne;
export const useCreateTutor = hooks.useCreate;
export const useUpdateTutor = hooks.useUpdate;
export const useDeleteTutor = hooks.useRemove;

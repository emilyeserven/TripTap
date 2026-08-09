import { createEntityHooks } from "./createEntityHooks";

import { cultureTopicsApi } from "@/lib/api";

const hooks = createEntityHooks({
  key: ["culture-topics"] as const,
  api: cultureTopicsApi,
  label: "topic",
});

export const useCultureTopics = hooks.useList;
export const useCultureTopic = hooks.useOne;
export const useCreateCultureTopic = hooks.useCreate;
export const useUpdateCultureTopic = hooks.useUpdate;
export const useDeleteCultureTopic = hooks.useRemove;

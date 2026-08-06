import { createEntityHooks } from "./createEntityHooks";

import { questionSheetsApi } from "@/lib/api";

const hooks = createEntityHooks({
  key: ["question-sheets"] as const,
  api: questionSheetsApi,
  label: "question sheet",
});

export const useQuestionSheets = hooks.useList;
/** A single question sheet by id (for its view / edit pages). */
export const useQuestionSheet = hooks.useOne;
export const useCreateQuestionSheet = hooks.useCreate;
export const useUpdateQuestionSheet = hooks.useUpdate;
export const useDeleteQuestionSheet = hooks.useRemove;

import { createEntityHooks } from "./createEntityHooks";

import { grammarNotesApi } from "@/lib/api";

const hooks = createEntityHooks({
  key: ["grammar-notes"] as const,
  api: grammarNotesApi,
  label: "grammar note",
});

export const useGrammarNotes = hooks.useList;
/** A single grammar note by id (for its view / edit pages). */
export const useGrammarNote = hooks.useOne;
export const useCreateGrammarNote = hooks.useCreate;
export const useUpdateGrammarNote = hooks.useUpdate;
export const useDeleteGrammarNote = hooks.useRemove;

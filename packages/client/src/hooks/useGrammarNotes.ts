import type { CreateGrammarNoteInput, UpdateGrammarNoteInput } from "@sentence-bank/types";

import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { useEntityCacheSync } from "./useEntityCacheSync";
import { grammarNotesApi } from "../lib/api";

const GRAMMAR_NOTES_KEY = ["grammar-notes"] as const;

export function useGrammarNotes() {
  return useQuery({
    queryKey: GRAMMAR_NOTES_KEY,
    queryFn: () => grammarNotesApi.list(),
  });
}

/** A single grammar note by id (for its view / edit pages). */
export function useGrammarNote(id: string) {
  return useQuery({
    queryKey: [...GRAMMAR_NOTES_KEY, id],
    queryFn: () => grammarNotesApi.get(id),
  });
}

export function useCreateGrammarNote() {
  const {
    seed,
  } = useEntityCacheSync(GRAMMAR_NOTES_KEY);
  return useMutation({
    mutationFn: (input: CreateGrammarNoteInput) => grammarNotesApi.create(input),
    onSuccess: seed,
    onError: err => toast.error("Couldn't save the grammar note", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useUpdateGrammarNote() {
  const {
    seed,
  } = useEntityCacheSync(GRAMMAR_NOTES_KEY);
  return useMutation({
    mutationFn: ({
      id, input,
    }: { id: string;
      input: UpdateGrammarNoteInput; }) =>
      grammarNotesApi.update(id, input),
    onSuccess: seed,
    onError: err => toast.error("Couldn't update the grammar note", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useDeleteGrammarNote() {
  const {
    invalidate,
  } = useEntityCacheSync(GRAMMAR_NOTES_KEY);
  return useMutation({
    mutationFn: (id: string) => grammarNotesApi.remove(id),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't delete the grammar note", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

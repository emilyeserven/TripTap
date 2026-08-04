import type { CreateDialogueInput, UpdateDialogueInput } from "@sentence-bank/types";

import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { useEntityCacheSync } from "./useEntityCacheSync";
import { dialoguesApi } from "../lib/api";

const DIALOGUES_KEY = ["dialogues"] as const;

export function useDialogues() {
  return useQuery({
    queryKey: DIALOGUES_KEY,
    queryFn: () => dialoguesApi.list(),
  });
}

export function useDialogue(id: string) {
  return useQuery({
    queryKey: [...DIALOGUES_KEY, id],
    queryFn: () => dialoguesApi.get(id),
  });
}

export function useCreateDialogue() {
  const {
    seed,
  } = useEntityCacheSync(DIALOGUES_KEY);
  return useMutation({
    mutationFn: (input: CreateDialogueInput) => dialoguesApi.create(input),
    onSuccess: seed,
    onError: err => toast.error("Couldn't create the dialogue", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useUpdateDialogue() {
  const {
    seed,
  } = useEntityCacheSync(DIALOGUES_KEY);
  return useMutation({
    mutationFn: ({
      id, input,
    }: { id: string;
      input: UpdateDialogueInput; }) => dialoguesApi.update(id, input),
    onSuccess: seed,
    onError: err => toast.error("Couldn't save the dialogue", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useDeleteDialogue() {
  const {
    invalidate,
  } = useEntityCacheSync(DIALOGUES_KEY);
  return useMutation({
    mutationFn: (id: string) => dialoguesApi.remove(id),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't delete the dialogue", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

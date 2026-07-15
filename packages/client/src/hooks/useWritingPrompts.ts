import type { CreateWritingPromptInput, UpdateWritingPromptInput } from "@sentence-bank/types";

import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { useEntityCacheSync } from "./useEntityCacheSync";
import { writingPromptsApi } from "../lib/api";

const WRITING_PROMPTS_KEY = ["writing-prompts"] as const;

export function useWritingPrompts() {
  return useQuery({
    queryKey: WRITING_PROMPTS_KEY,
    queryFn: () => writingPromptsApi.list(),
  });
}

export function useWritingPrompt(id: string) {
  return useQuery({
    queryKey: [...WRITING_PROMPTS_KEY, id],
    queryFn: () => writingPromptsApi.get(id),
  });
}

export function useCreateWritingPrompt() {
  const {
    seed,
  } = useEntityCacheSync(WRITING_PROMPTS_KEY);
  return useMutation({
    mutationFn: (input: CreateWritingPromptInput) => writingPromptsApi.create(input),
    onSuccess: seed,
    onError: err => toast.error("Couldn't create your prompt", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useCreateWritingPromptsMany() {
  const {
    seedMany,
  } = useEntityCacheSync(WRITING_PROMPTS_KEY);
  return useMutation({
    mutationFn: (inputs: CreateWritingPromptInput[]) => writingPromptsApi.createMany(inputs),
    onSuccess: seedMany,
    onError: err => toast.error("Couldn't add your prompts", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useUpdateWritingPrompt() {
  const {
    seed,
  } = useEntityCacheSync(WRITING_PROMPTS_KEY);
  return useMutation({
    mutationFn: ({
      id, input,
    }: { id: string;
      input: UpdateWritingPromptInput; }) =>
      writingPromptsApi.update(id, input),
    onSuccess: seed,
    onError: err => toast.error("Couldn't save your prompt", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useDeleteWritingPrompt() {
  const {
    invalidate,
  } = useEntityCacheSync(WRITING_PROMPTS_KEY);
  return useMutation({
    mutationFn: (id: string) => writingPromptsApi.remove(id),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't delete your prompt", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

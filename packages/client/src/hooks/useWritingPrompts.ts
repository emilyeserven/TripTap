import type { CreateWritingPromptInput, UpdateWritingPromptInput } from "@sentence-bank/types";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { writingPromptsApi } from "../lib/api";

const WRITING_PROMPTS_KEY = ["writing-prompts"] as const;

function useWritingPromptInvalidator() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({
      queryKey: WRITING_PROMPTS_KEY,
    });
  };
}

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
  const invalidate = useWritingPromptInvalidator();
  return useMutation({
    mutationFn: (input: CreateWritingPromptInput) => writingPromptsApi.create(input),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't create your prompt", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useUpdateWritingPrompt() {
  const invalidate = useWritingPromptInvalidator();
  return useMutation({
    mutationFn: ({
      id, input,
    }: { id: string;
      input: UpdateWritingPromptInput; }) =>
      writingPromptsApi.update(id, input),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't save your prompt", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useDeleteWritingPrompt() {
  const invalidate = useWritingPromptInvalidator();
  return useMutation({
    mutationFn: (id: string) => writingPromptsApi.remove(id),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't delete your prompt", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

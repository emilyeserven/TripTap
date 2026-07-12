import type { UpdateCaptureInput } from "../lib/api";
import type { CreateCaptureInput, Sentence } from "@sentence-bank/types";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { capturesApi } from "../lib/api";

const CAPTURES_KEY = ["captures"] as const;

export function useCaptures() {
  return useQuery({
    queryKey: CAPTURES_KEY,
    queryFn: capturesApi.list,
  });
}

export function useCapture(id: string) {
  return useQuery({
    queryKey: [...CAPTURES_KEY, id],
    queryFn: () => capturesApi.get(id),
  });
}

/** Sentences mined from a given capture. Invalidated on any sentence mutation. */
export function useCaptureSentences(id: string) {
  return useQuery({
    queryKey: [...CAPTURES_KEY, id, "sentences"],
    queryFn: () => capturesApi.sentences(id),
  });
}

/** Vocab mined from a given capture. Invalidated on any vocab mutation. */
export function useCaptureVocab(id: string) {
  return useQuery({
    queryKey: [...CAPTURES_KEY, id, "vocab"],
    queryFn: () => capturesApi.vocab(id),
  });
}

/**
 * Persist a manual order for a capture's sentences. Optimistically reorders the cached
 * capture-sentence list so the drag settles instantly, rolling back on error and reconciling with
 * the server response on success.
 */
export function useReorderCaptureSentences(captureId: string) {
  const queryClient = useQueryClient();
  const queryKey = [...CAPTURES_KEY, captureId, "sentences"] as const;
  return useMutation({
    mutationFn: (sentenceIds: string[]) => capturesApi.reorderSentences(captureId, sentenceIds),
    onMutate: async (sentenceIds) => {
      await queryClient.cancelQueries({
        queryKey,
      });
      const previous = queryClient.getQueryData<Sentence[]>(queryKey);
      if (previous) {
        const byId = new Map(previous.map(s => [s.id, s]));
        const reordered = sentenceIds
          .map(id => byId.get(id))
          .filter((s): s is Sentence => s !== undefined);
        queryClient.setQueryData<Sentence[]>(queryKey, reordered);
      }
      return {
        previous,
      };
    },
    onError: (_err, _ids, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSuccess: sentences => queryClient.setQueryData(queryKey, sentences),
  });
}

export function useCreateCapture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      input, image,
    }: { input: CreateCaptureInput;
      image: Blob | null; }) =>
      capturesApi.create(input, image),
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: CAPTURES_KEY,
    }),
  });
}

export function useUpdateCapture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id, input,
    }: { id: string;
      input: UpdateCaptureInput; }) =>
      capturesApi.update(id, input),
    onSuccess: (capture) => {
      queryClient.invalidateQueries({
        queryKey: CAPTURES_KEY,
      });
      queryClient.invalidateQueries({
        queryKey: [...CAPTURES_KEY, capture.id],
      });
    },
  });
}

export function useDeleteCapture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => capturesApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: CAPTURES_KEY,
    }),
  });
}

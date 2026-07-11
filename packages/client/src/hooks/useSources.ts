import type { CreateSourceInput, UpdateSourceInput } from "@sentence-bank/types";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { sourcesApi } from "../lib/api";

const SOURCES_KEY = ["sources"] as const;

export function useSources() {
  return useQuery({
    queryKey: SOURCES_KEY,
    queryFn: sourcesApi.list,
  });
}

/** Invalidate sources plus everything that displays a source name / reference. */
function useSourceInvalidator() {
  const queryClient = useQueryClient();
  return () => {
    for (const key of [SOURCES_KEY, ["sentences"], ["captures"], ["vocab"]]) {
      queryClient.invalidateQueries({
        queryKey: key,
      });
    }
  };
}

export function useCreateSource() {
  const invalidate = useSourceInvalidator();
  return useMutation({
    mutationFn: (input: CreateSourceInput) => sourcesApi.create(input),
    onSuccess: invalidate,
  });
}

export function useUpdateSource() {
  const invalidate = useSourceInvalidator();
  return useMutation({
    mutationFn: ({
      id, input,
    }: { id: string;
      input: UpdateSourceInput; }) => sourcesApi.update(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteSource() {
  const invalidate = useSourceInvalidator();
  return useMutation({
    mutationFn: (id: string) => sourcesApi.remove(id),
    onSuccess: invalidate,
  });
}

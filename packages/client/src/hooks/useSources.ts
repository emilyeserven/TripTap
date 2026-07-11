import type { CreateSourceInput } from "@sentence-bank/types";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { sourcesApi } from "../lib/api";

const SOURCES_KEY = ["sources"] as const;

export function useSources() {
  return useQuery({
    queryKey: SOURCES_KEY,
    queryFn: sourcesApi.list,
  });
}

export function useCreateSource() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSourceInput) => sourcesApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: SOURCES_KEY,
    }),
  });
}

import type { CreateParseTemplateInput } from "@sentence-bank/types";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { parseTemplatesApi } from "../lib/api";

const TEMPLATES_KEY = ["parse-templates"] as const;

export function useParseTemplates() {
  return useQuery({
    queryKey: TEMPLATES_KEY,
    queryFn: parseTemplatesApi.list,
  });
}

export function useCreateParseTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateParseTemplateInput) => parseTemplatesApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: TEMPLATES_KEY,
    }),
  });
}

export function useDeleteParseTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => parseTemplatesApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: TEMPLATES_KEY,
    }),
  });
}

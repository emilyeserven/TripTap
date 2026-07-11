import type { CreateCaptureInput } from "@sentence-bank/types";

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

export function useDeleteCapture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => capturesApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: CAPTURES_KEY,
    }),
  });
}

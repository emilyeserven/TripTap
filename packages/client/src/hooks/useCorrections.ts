import type { CorrectionListParams } from "../lib/api";
import type {
  CreateCorrectionInput,
  TriageCorrectionInput,
  UpdateCorrectionInput,
} from "@sentence-bank/types";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useEntityCacheSync } from "./useEntityCacheSync";
import { correctionsApi } from "../lib/api";

const CORRECTIONS_KEY = ["corrections"] as const;
const CORRECTION_LOG_KEY = ["corrections", "log"] as const;

export function useCorrections(params?: CorrectionListParams) {
  return useQuery({
    queryKey: [...CORRECTIONS_KEY, "list", params ?? {}],
    queryFn: () => correctionsApi.list(params),
  });
}

export function useCorrection(id: string) {
  return useQuery({
    queryKey: [...CORRECTIONS_KEY, id],
    queryFn: () => correctionsApi.get(id),
  });
}

export function useCorrectionLog() {
  return useQuery({
    queryKey: CORRECTION_LOG_KEY,
    queryFn: () => correctionsApi.log(),
  });
}

export function useCreateCorrection() {
  const {
    seed,
  } = useEntityCacheSync(CORRECTIONS_KEY);
  return useMutation({
    mutationFn: (input: CreateCorrectionInput) => correctionsApi.create(input),
    onSuccess: seed,
    onError: err => toast.error("Couldn't save the correction", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useUpdateCorrection() {
  const {
    seed,
  } = useEntityCacheSync(CORRECTIONS_KEY);
  return useMutation({
    mutationFn: ({
      id, input,
    }: { id: string;
      input: UpdateCorrectionInput; }) => correctionsApi.update(id, input),
    onSuccess: seed,
    onError: err => toast.error("Couldn't save the correction", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useTriageCorrection() {
  const {
    invalidate,
  } = useEntityCacheSync(CORRECTIONS_KEY);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id, input,
    }: { id: string;
      input: TriageCorrectionInput; }) => correctionsApi.triage(id, input),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({
        queryKey: CORRECTION_LOG_KEY,
      });
    },
    onError: err => toast.error("Couldn't triage the correction", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useDeleteCorrection() {
  const {
    invalidate,
  } = useEntityCacheSync(CORRECTIONS_KEY);
  return useMutation({
    mutationFn: (id: string) => correctionsApi.remove(id),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't delete the correction", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

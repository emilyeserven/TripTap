import type { CommitMigakuImportInput } from "@sentence-bank/types";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useEntityCacheSync } from "./useEntityCacheSync";
import { migakuImportsApi } from "../lib/api";

const MIGAKU_IMPORTS_KEY = ["migaku-imports"] as const;

export function useMigakuImports() {
  return useQuery({
    queryKey: MIGAKU_IMPORTS_KEY,
    queryFn: () => migakuImportsApi.list(),
  });
}

export function useMigakuImport(id: string) {
  return useQuery({
    queryKey: [...MIGAKU_IMPORTS_KEY, id],
    queryFn: () => migakuImportsApi.get(id),
  });
}

export function useUploadMigakuImport() {
  const {
    invalidate,
  } = useEntityCacheSync(MIGAKU_IMPORTS_KEY);
  return useMutation({
    mutationFn: (file: File) => migakuImportsApi.upload(file),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't read that .apkg file", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useCommitMigakuImport() {
  const {
    invalidate,
  } = useEntityCacheSync(MIGAKU_IMPORTS_KEY);
  return useMutation({
    mutationFn: ({
      id, input,
    }: { id: string;
      input: CommitMigakuImportInput; }) => migakuImportsApi.commit(id, input),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't import those cards", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useDeleteMigakuImport() {
  const {
    invalidate,
  } = useEntityCacheSync(MIGAKU_IMPORTS_KEY);
  return useMutation({
    mutationFn: (id: string) => migakuImportsApi.remove(id),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't discard the import", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

/** Delete every card imported under a deck; also refreshes the sentence & vocab banks. */
export function useDeleteDeckCards() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => migakuImportsApi.deleteCards(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: MIGAKU_IMPORTS_KEY,
      });
      queryClient.invalidateQueries({
        queryKey: ["sentences"],
      });
      queryClient.invalidateQueries({
        queryKey: ["vocab"],
      });
    },
    onError: err => toast.error("Couldn't delete the deck's cards", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

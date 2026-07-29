import type {
  CreateChunkCardInput,
  CreateRuleGroupInput,
  UpdateChunkCardInput,
  UpdateRuleGroupInput,
} from "@sentence-bank/types";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useEntityCacheSync } from "./useEntityCacheSync";
import { chunkCardsApi, ruleGroupsApi } from "../lib/api";

const RULE_GROUPS_KEY = ["rule-groups"] as const;
const CHUNK_CARDS_KEY = ["chunk-cards"] as const;

/* ── Rule groups ─────────────────────────────────────────────────────────────────────────────────── */

export function useRuleGroups() {
  return useQuery({
    queryKey: RULE_GROUPS_KEY,
    queryFn: () => ruleGroupsApi.list(),
  });
}

export function useRuleGroup(id: string) {
  return useQuery({
    queryKey: [...RULE_GROUPS_KEY, id],
    queryFn: () => ruleGroupsApi.get(id),
  });
}

export function useCreateRuleGroup() {
  const {
    seed,
  } = useEntityCacheSync(RULE_GROUPS_KEY);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRuleGroupInput) => ruleGroupsApi.create(input),
    onSuccess: (group) => {
      seed(group);
      // A new group links its seed corrections' producedCardIds, so the log's view of them changes.
      queryClient.invalidateQueries({
        queryKey: ["corrections", "log"],
      });
    },
    onError: err => toast.error("Couldn't create the rule group", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useUpdateRuleGroup() {
  const {
    seed,
  } = useEntityCacheSync(RULE_GROUPS_KEY);
  return useMutation({
    mutationFn: ({
      id, input,
    }: { id: string;
      input: UpdateRuleGroupInput; }) => ruleGroupsApi.update(id, input),
    onSuccess: seed,
    onError: err => toast.error("Couldn't save the rule group", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useDeleteRuleGroup() {
  const {
    invalidate,
  } = useEntityCacheSync(RULE_GROUPS_KEY);
  return useMutation({
    mutationFn: (id: string) => ruleGroupsApi.remove(id),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't delete the rule group", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

/* ── Chunk cards ─────────────────────────────────────────────────────────────────────────────────── */

export function useChunkCards(batchId?: string) {
  return useQuery({
    queryKey: [...CHUNK_CARDS_KEY, batchId ?? "all"],
    queryFn: () => chunkCardsApi.list(batchId),
  });
}

export function useCreateChunkCard() {
  const {
    invalidate,
  } = useEntityCacheSync(CHUNK_CARDS_KEY);
  return useMutation({
    mutationFn: (input: CreateChunkCardInput) => chunkCardsApi.create(input),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't create the chunk card", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useUpdateChunkCard() {
  const {
    invalidate,
  } = useEntityCacheSync(CHUNK_CARDS_KEY);
  return useMutation({
    mutationFn: ({
      id, input,
    }: { id: string;
      input: UpdateChunkCardInput; }) => chunkCardsApi.update(id, input),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't save the chunk card", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

export function useDeleteChunkCard() {
  const {
    invalidate,
  } = useEntityCacheSync(CHUNK_CARDS_KEY);
  return useMutation({
    mutationFn: (id: string) => chunkCardsApi.remove(id),
    onSuccess: invalidate,
    onError: err => toast.error("Couldn't delete the chunk card", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

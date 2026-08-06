/** Correction-triage API: capture, triage, import, rule tags/groups, chunk cards, and the log. */
import type {
  ChunkCard,
  Correction,
  CorrectionImportCandidate,
  CorrectionImportKind,
  CorrectionLog,
  CreateChunkCardInput,
  CreateCorrectionInput,
  CreateRuleGroupInput,
  GrammarFailureStats,
  ImportCorrectionsInput,
  RuleGroup,
  RuleTag,
  TriageCorrectionInput,
  UpdateChunkCardInput,
  UpdateCorrectionInput,
  UpdateRuleGroupInput,
  UpsertRuleTagInput,
} from "@sentence-bank/types";

import { crudApi } from "./crud";
import { request } from "./request";

/** Filters for the correction list: `untriaged` limits to the Inbox; `batchId` scopes to one batch. */
export interface CorrectionListParams {
  untriaged?: boolean;
  batchId?: string;
}

function listQuery(params?: CorrectionListParams): string {
  const search = new URLSearchParams();
  if (params?.untriaged) search.set("untriaged", "true");
  if (params?.batchId) search.set("batchId", params.batchId);
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export const correctionsApi = {
  list: (params?: CorrectionListParams) =>
    request<Correction[]>(`/corrections${listQuery(params)}`),
  get: (id: string) => request<Correction>(`/corrections/${id}`),
  log: () => request<CorrectionLog>("/corrections/log"),
  grammarStats: (grammarTagId: string) =>
    request<GrammarFailureStats>(
      `/corrections/grammar-stats?grammarTagId=${encodeURIComponent(grammarTagId)}`,
    ),
  importable: (kind: CorrectionImportKind) =>
    request<CorrectionImportCandidate[]>(`/corrections/importable?kind=${kind}`),
  import: (input: ImportCorrectionsInput) =>
    request<Correction[]>("/corrections/import", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  create: (input: CreateCorrectionInput) =>
    request<Correction>("/corrections", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (id: string, input: UpdateCorrectionInput) =>
    request<Correction>(`/corrections/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  /** Apply a triage verdict. Returns the updated correction, or `undefined` when a slip deleted it. */
  triage: (id: string, input: TriageCorrectionInput) =>
    request<Correction | undefined>(`/corrections/${id}/triage`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  remove: (id: string) => request<undefined>(`/corrections/${id}`, {
    method: "DELETE",
  }),
};

export const ruleTagsApi = {
  list: () => request<RuleTag[]>("/rule-tags"),
  upsert: (input: UpsertRuleTagInput) =>
    request<RuleTag>("/rule-tags", {
      method: "PUT",
      body: JSON.stringify(input),
    }),
};

export const ruleGroupsApi = crudApi<RuleGroup, CreateRuleGroupInput, UpdateRuleGroupInput>("/rule-groups");

export const chunkCardsApi = {
  ...crudApi<ChunkCard, CreateChunkCardInput, UpdateChunkCardInput>("/chunk-cards"),
  /** Optionally scoped to one capture batch. */
  list: (batchId?: string) =>
    request<ChunkCard[]>(`/chunk-cards${batchId ? `?batchId=${batchId}` : ""}`),
};

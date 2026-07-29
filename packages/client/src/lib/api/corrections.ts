/** Correction-triage API: capture, triage, import, and the derived error log. */
import type {
  Correction,
  CorrectionImportCandidate,
  CorrectionImportKind,
  CorrectionLog,
  CreateCorrectionInput,
  ImportCorrectionsInput,
  TriageCorrectionInput,
  UpdateCorrectionInput,
} from "@sentence-bank/types";

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

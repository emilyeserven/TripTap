import type { UpdateBookmarksSettingsInput, UpdateOcrSettingsInput } from "@sentence-bank/types";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { settingsApi } from "../lib/api";

const OCR_SETTINGS_KEY = ["settings", "ocr"] as const;
const BOOKMARKS_SETTINGS_KEY = ["settings", "bookmarks"] as const;

/** Masked view of the stored cloud OCR credentials (presence + hint, never the raw secrets). */
export function useOcrSettings() {
  return useQuery({
    queryKey: OCR_SETTINGS_KEY,
    queryFn: settingsApi.getOcr,
  });
}

export function useUpdateOcrSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateOcrSettingsInput) => settingsApi.updateOcr(input),
    onSuccess: data => queryClient.setQueryData(OCR_SETTINGS_KEY, data),
  });
}

/** The bookmarks integration settings (endpoint URL + chosen tag/taxonomy source). */
export function useBookmarksSettings() {
  return useQuery({
    queryKey: BOOKMARKS_SETTINGS_KEY,
    queryFn: settingsApi.getBookmarks,
  });
}

export function useUpdateBookmarksSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateBookmarksSettingsInput) => settingsApi.updateBookmarks(input),
    onSuccess: (data) => {
      queryClient.setQueryData(BOOKMARKS_SETTINGS_KEY, data);
      // The selectable vocabulary depends on the chosen source — refetch it.
      queryClient.invalidateQueries({
        queryKey: ["bookmarks"],
      });
    },
  });
}

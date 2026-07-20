import type {
  UpdateBookmarksSettingsInput,
  UpdateDictionarySettingsInput,
  UpdateLearnerProfileInput,
  UpdateOcrSettingsInput,
  UpdateRenshuuSettingsInput,
  UpdateXpSettingsInput,
} from "@sentence-bank/types";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { settingsApi } from "../lib/api";

const OCR_SETTINGS_KEY = ["settings", "ocr"] as const;
const RENSHUU_SETTINGS_KEY = ["settings", "renshuu"] as const;
const BOOKMARKS_SETTINGS_KEY = ["settings", "bookmarks"] as const;
const DICTIONARY_SETTINGS_KEY = ["settings", "dictionary"] as const;
const MEDIA_SETTINGS_KEY = ["settings", "media"] as const;
const LEARNER_PROFILE_KEY = ["settings", "profile"] as const;

/** The learner profile: up to three goals with their targeted areas/terms. */
export function useLearnerProfile() {
  return useQuery({
    queryKey: LEARNER_PROFILE_KEY,
    queryFn: settingsApi.getProfile,
  });
}

const XP_SETTINGS_KEY = ["settings", "xp"] as const;

/** The effective XP rates (defaults merged with any overrides). */
export function useXpSettings() {
  return useQuery({
    queryKey: XP_SETTINGS_KEY,
    queryFn: settingsApi.getXp,
  });
}

export function useUpdateXpSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateXpSettingsInput) => settingsApi.updateXp(input),
    onSuccess: (data) => {
      queryClient.setQueryData(XP_SETTINGS_KEY, data);
      // XP is derived, so new rates re-score everything — drop every cached summary.
      queryClient.invalidateQueries({
        queryKey: ["xp-summary"],
      });
    },
  });
}

export function useUpdateLearnerProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateLearnerProfileInput) => settingsApi.updateProfile(input),
    onSuccess: data => queryClient.setQueryData(LEARNER_PROFILE_KEY, data),
  });
}

/** Non-secret status of the media object store (S3/Garage) config. */
export function useMediaSettings() {
  return useQuery({
    queryKey: MEDIA_SETTINGS_KEY,
    queryFn: settingsApi.getMedia,
  });
}

/** Runs a live write/read/delete round-trip against the media bucket. */
export function useTestMediaConnection() {
  return useMutation({
    mutationFn: () => settingsApi.testMedia(),
  });
}

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

/** Masked view of the stored Renshuu API key (presence + hint, never the raw secret). */
export function useRenshuuSettings() {
  return useQuery({
    queryKey: RENSHUU_SETTINGS_KEY,
    queryFn: settingsApi.getRenshuu,
  });
}

export function useUpdateRenshuuSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateRenshuuSettingsInput) => settingsApi.updateRenshuu(input),
    onSuccess: data => queryClient.setQueryData(RENSHUU_SETTINGS_KEY, data),
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

/** The dictionary integration settings (endpoint URL + chosen provider). */
export function useDictionarySettings() {
  return useQuery({
    queryKey: DICTIONARY_SETTINGS_KEY,
    queryFn: settingsApi.getDictionary,
  });
}

export function useUpdateDictionarySettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateDictionarySettingsInput) => settingsApi.updateDictionary(input),
    onSuccess: data => queryClient.setQueryData(DICTIONARY_SETTINGS_KEY, data),
  });
}

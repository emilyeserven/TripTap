import type {
  KanjiDetail,
  KanjiListQuery,
  KanjiSummary,
  UpdateKanjiStatusInput,
} from "@sentence-bank/types";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { kanjiApi } from "@/lib/api";

/**
 * TanStack Query hooks for the Kanji tracker.
 *
 * Hand-written rather than built from `createEntityHooks`: that factory assumes the five-method
 * `CrudApi` over a uuid-keyed entity, and this feature has no create or delete (the grid is derived
 * from the corpus), is keyed by character, and takes list filters. The toast copy still follows the
 * factory's one-verb-per-operation convention, and the explicit `<T, Error>` generics are kept for
 * the reason documented there — without them TanStack's default error type widens and `error.message`
 * breaks at call sites.
 */

/** The query key root. */
export const KANJI_KEY = ["kanji"] as const;

/** The kanji grid, filtered and sorted server-side. */
export function useKanjiList(query: KanjiListQuery = {}) {
  return useQuery<KanjiSummary[], Error>({
    queryKey: [...KANJI_KEY, query],
    queryFn: () => kanjiApi.list(query),
  });
}

/** One character's detail, including every item it appears in. */
export function useKanji(char: string) {
  return useQuery<KanjiDetail, Error>({
    queryKey: [...KANJI_KEY, "char", char],
    queryFn: () => kanjiApi.get(char),
    enabled: Boolean(char),
  });
}

/**
 * Set a character's status.
 *
 * The route returns the full refreshed detail, so the response seeds the by-character cache directly
 * and only the grid needs invalidating — a status change reorders nothing the detail page shows.
 */
export function useSetKanjiStatus() {
  const queryClient = useQueryClient();
  return useMutation<KanjiDetail, Error, { char: string;
    input: UpdateKanjiStatusInput; }>({
    mutationFn: ({
      char, input,
    }) => kanjiApi.setStatus(char, input),
    onSuccess: (detail) => {
      queryClient.setQueryData([...KANJI_KEY, "char", detail.char], detail);
      void queryClient.invalidateQueries({
        queryKey: KANJI_KEY,
      });
    },
    onError: err => toast.error("Couldn't update the kanji status", {
      description: err.message,
    }),
  });
}

import { useMutation } from "@tanstack/react-query";

import { dictionaryApi } from "../lib/api";

/**
 * Looks a Japanese word/phrase up in the configured dictionary and returns normalized entries. Modeled
 * as a mutation because the lookup is an explicit user action (a button click) against an external,
 * latency-heavy host — not something to fire on every keystroke.
 */
export function useDictionarySearch() {
  return useMutation({
    mutationFn: (keyword: string) => dictionaryApi.search(keyword),
  });
}

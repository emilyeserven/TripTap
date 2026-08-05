import { useQuery } from "@tanstack/react-query";

import { termsApi } from "../lib/api";

/**
 * Everything tagged with one term, across every feature that stores term refs. Server-computed in a
 * single request — the alternative is fetching each feature's whole list and filtering client-side,
 * which is why most tagged entities were never surfaced anywhere.
 */
export function useTermUsages(termId: string | null) {
  return useQuery({
    queryKey: ["term-usages", termId],
    queryFn: () => termsApi.usages(termId as string),
    enabled: Boolean(termId),
  });
}

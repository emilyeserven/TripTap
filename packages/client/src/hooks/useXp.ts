import { useQuery } from "@tanstack/react-query";

import { xpApi } from "../lib/api";

/**
 * The derived XP summary (per-area totals + recent window). Server-computed from all learner content,
 * so it's refetched rather than cache-synced when activity changes.
 */
export function useXpSummary(days?: number) {
  return useQuery({
    queryKey: ["xp-summary", days ?? null],
    queryFn: () => xpApi.summary(days),
  });
}

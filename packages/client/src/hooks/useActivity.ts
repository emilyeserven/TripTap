import { useQuery } from "@tanstack/react-query";

import { activityApi } from "../lib/api";

/**
 * The daily activity feed (per-day XP-earning work). Server-computed from all learner content, so it's
 * refetched rather than cache-synced when activity changes.
 */
export function useActivity(days?: number) {
  return useQuery({
    queryKey: ["activity", days ?? null],
    queryFn: () => activityApi.list(days),
  });
}

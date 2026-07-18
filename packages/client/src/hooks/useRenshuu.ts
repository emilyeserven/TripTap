import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { renshuuApi } from "../lib/api";

/**
 * Searches Renshuu's example-sentence bank for a word (using the learner's stored API key). A
 * mutation because it's an explicit "Find examples" click against an external host, not per-keystroke.
 */
export function useRenshuuExamples() {
  return useMutation({
    mutationFn: (query: string) => renshuuApi.search(query),
    onError: err => toast.error("Couldn't reach Renshuu", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

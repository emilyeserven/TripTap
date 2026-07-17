import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { tatoebaApi } from "../lib/api";

/**
 * Searches Tatoeba for Japanese example sentences containing a word (with English translations). A
 * mutation because it's an explicit "Find examples" click against an external host, not per-keystroke.
 */
export function useExampleSentences() {
  return useMutation({
    mutationFn: (query: string) => tatoebaApi.search(query),
    onError: err => toast.error("Couldn't reach Tatoeba", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

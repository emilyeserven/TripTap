import type { RecognizeHandwritingInput } from "@sentence-bank/types";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { handwritingApi } from "../lib/api";

/**
 * Recognizes drawn strokes as candidate characters. A mutation because it's driven by an explicit
 * drawing gesture against an external host, not by rendering — the draw pad fires it when the learner
 * pauses, so a whole character costs a request or two rather than one per stroke.
 */
export function useRecognizeHandwriting() {
  return useMutation({
    mutationFn: (input: RecognizeHandwritingInput) => handwritingApi.recognize(input),
    onError: err => toast.error("Couldn't recognize that drawing", {
      description: err instanceof Error ? err.message : undefined,
    }),
  });
}

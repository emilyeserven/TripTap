import { useMutation } from "@tanstack/react-query";

import { ocrApi } from "../lib/api";

/** Runs an image through the OCR service and returns the recognized text blocks. */
export function useOcr() {
  return useMutation({
    mutationFn: (file: File) => ocrApi.recognize(file),
  });
}

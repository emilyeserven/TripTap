import { UpstreamNotConfiguredError, UpstreamUnavailableError } from "@/services/upstream-errors";

/** Raised when the OCR feature is used but no OCR backend is configured. */
export class OcrNotConfiguredError extends UpstreamNotConfiguredError {
  constructor(message = "OCR service not configured") {
    super(message);
    this.name = "OcrNotConfiguredError";
  }
}

/** Raised when every configured OCR backend is unreachable, times out, or errors. */
export class OcrUnavailableError extends UpstreamUnavailableError {
  constructor(message: string) {
    super(message);
    this.name = "OcrUnavailableError";
  }
}

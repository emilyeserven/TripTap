import { UpstreamUnavailableError } from "@/services/upstream-errors";

/** Raised when the handwriting recognizer is unreachable, times out, or returns a non-2xx response. */
export class HandwritingUnavailableError extends UpstreamUnavailableError {
  constructor(message: string) {
    super(message);
    this.name = "HandwritingUnavailableError";
  }
}

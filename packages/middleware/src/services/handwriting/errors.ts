/** Raised when the handwriting recognizer is unreachable, times out, or returns a non-2xx response. */
export class HandwritingUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HandwritingUnavailableError";
  }
}

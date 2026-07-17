/** Raised when the Tatoeba API is unreachable, times out, or returns a non-2xx response. */
export class TatoebaUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TatoebaUnavailableError";
  }
}

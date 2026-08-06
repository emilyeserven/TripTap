import { UpstreamUnavailableError } from "@/services/upstream-errors";

/** Raised when the Tatoeba API is unreachable, times out, or returns a non-2xx response. */
export class TatoebaUnavailableError extends UpstreamUnavailableError {
  constructor(message: string) {
    super(message);
    this.name = "TatoebaUnavailableError";
  }
}

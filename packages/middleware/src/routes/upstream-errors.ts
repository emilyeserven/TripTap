import type { FastifyReply } from "fastify";

import {
  UpstreamNotConfiguredError,
  UpstreamUnavailableError,
} from "@/services/upstream-errors";

/**
 * Map an external-integration failure to its HTTP status; rethrow anything else so genuine bugs
 * still surface as 500s.
 *
 * Every proxy route had its own copy of this ladder, naming its own two error classes. Since those
 * classes now share base types, one handler covers all of them — and a new integration gets the
 * mapping by extending the bases rather than by remembering to write the ladder again.
 *
 *  - not configured → **503**: the feature exists but this deployment hasn't set it up.
 *  - unavailable    → **502**: it is set up, but the upstream didn't answer usefully.
 */
export function handleUpstreamError(err: unknown, reply: FastifyReply): FastifyReply {
  if (err instanceof UpstreamNotConfiguredError) {
    return reply.code(503).send({
      message: err.message,
    });
  }
  if (err instanceof UpstreamUnavailableError) {
    return reply.code(502).send({
      message: err.message,
    });
  }
  throw err;
}

import type { FastifyInstance, FastifyReply } from "fastify";
import {
  RenshuuNotConfiguredError,
  RenshuuUnavailableError,
  searchExampleSentences,
} from "@/services/renshuu";

/** Map a Renshuu domain error to its HTTP status; rethrow anything else. */
function handleError(err: unknown, reply: FastifyReply): FastifyReply {
  if (err instanceof RenshuuNotConfiguredError) {
    return reply.code(503).send({
      message: err.message,
    });
  }
  if (err instanceof RenshuuUnavailableError) {
    return reply.code(502).send({
      message: err.message,
    });
  }
  throw err;
}

const searchQuery = {
  type: "object",
  required: ["query"],
  properties: {
    query: {
      type: "string",
      minLength: 1,
    },
    limit: {
      type: "integer",
      minimum: 1,
      maximum: 20,
    },
  },
} as const;

/**
 * Renshuu proxy routes, mounted under `/api/renshuu`. Forwards an example-sentence lookup to
 * `api.renshuu.org` with the learner's stored API key so the browser never sees the key. Returns 503
 * when no key is configured, 502 when the host is unreachable or rejects the key.
 */
export async function renshuuRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/renshuu/search", {
    schema: {
      tags: ["renshuu"],
      querystring: searchQuery,
    },
  }, async (req, reply) => {
    const {
      query, limit,
    } = req.query as { query: string;
      limit?: number; };
    try {
      return await searchExampleSentences(query, limit);
    }
    catch (err) {
      return handleError(err, reply);
    }
  });
}

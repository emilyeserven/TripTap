import type { FastifyInstance, FastifyReply } from "fastify";
import { searchExampleSentences, TatoebaUnavailableError } from "@/services/tatoeba";

/** Map a Tatoeba domain error to its HTTP status; rethrow anything else. */
function handleError(err: unknown, reply: FastifyReply): FastifyReply {
  if (err instanceof TatoebaUnavailableError) {
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
 * Tatoeba proxy routes, mounted under `/api/tatoeba`. Forwards an example-sentence lookup to
 * `api.tatoeba.org` so the browser never reaches it directly. An unreachable host returns 502.
 */
export async function tatoebaRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/tatoeba/search", {
    schema: {
      tags: ["tatoeba"],
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

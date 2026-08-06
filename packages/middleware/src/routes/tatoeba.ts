import { handleUpstreamError } from "@/routes/upstream-errors";
import type { FastifyInstance } from "fastify";
import { searchExampleSentences } from "@/services/tatoeba";

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
      return handleUpstreamError(err, reply);
    }
  });
}

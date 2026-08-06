import { handleUpstreamError } from "@/routes/upstream-errors";
import type { FastifyInstance } from "fastify";
import {
  searchDictionary,
} from "@/services/dictionary";

const searchQuery = {
  type: "object",
  required: ["keyword"],
  properties: {
    keyword: {
      type: "string",
      minLength: 1,
    },
  },
} as const;

/**
 * Dictionary proxy routes, mounted under `/api/dictionary`. They forward a lookup to the configured
 * upstream dictionary (Jisho or a self-hosted Jotoba) so the browser never reaches it directly and the
 * provider stays swappable. A missing endpoint returns 503; an unreachable host returns 502.
 */
export async function dictionaryRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/dictionary/search", {
    schema: {
      tags: ["dictionary"],
      querystring: searchQuery,
    },
  }, async (req, reply) => {
    const {
      keyword,
    } = req.query as { keyword: string };
    try {
      return await searchDictionary(keyword);
    }
    catch (err) {
      return handleUpstreamError(err, reply);
    }
  });
}

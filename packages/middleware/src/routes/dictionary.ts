import type { FastifyInstance, FastifyReply } from "fastify";
import {
  DictionaryNotConfiguredError,
  DictionaryUnavailableError,
  searchDictionary,
} from "@/services/dictionary";

/** Map a dictionary domain error to its HTTP status; rethrow anything else. */
function handleError(err: unknown, reply: FastifyReply): FastifyReply {
  if (err instanceof DictionaryNotConfiguredError) {
    return reply.code(503).send({
      message: err.message,
    });
  }
  if (err instanceof DictionaryUnavailableError) {
    return reply.code(502).send({
      message: err.message,
    });
  }
  throw err;
}

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
      return handleError(err, reply);
    }
  });
}

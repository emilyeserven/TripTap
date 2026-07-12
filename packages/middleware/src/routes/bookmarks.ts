import type { FastifyInstance, FastifyReply } from "fastify";
import {
  BookmarksNotConfiguredError,
  BookmarksUnavailableError,
  fetchTags,
  fetchTaxonomies,
  fetchTerms,
  fetchVocabulary,
} from "@/services/bookmarks";

/** Map a bookmarks domain error to its HTTP status; rethrow anything else. */
function handleError(err: unknown, reply: FastifyReply): FastifyReply {
  if (err instanceof BookmarksNotConfiguredError) {
    return reply.code(503).send({
      message: err.message,
    });
  }
  if (err instanceof BookmarksUnavailableError) {
    return reply.code(502).send({
      message: err.message,
    });
  }
  throw err;
}

const taxonomyParams = {
  type: "object",
  required: ["id"],
  properties: {
    id: {
      type: "string",
    },
  },
} as const;

/**
 * Bookmarks proxy routes, mounted under `/api/bookmarks`. They forward read-only calls to the
 * external bookmarks host (Tailnet-only, no auth) so the browser never has to reach it directly.
 * A missing endpoint returns 503; an unreachable host returns 502.
 */
export async function bookmarksRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/bookmarks/tags", {
    schema: {
      tags: ["bookmarks"],
    },
  }, async (_req, reply) => {
    try {
      return await fetchTags();
    }
    catch (err) {
      return handleError(err, reply);
    }
  });

  app.get("/api/bookmarks/taxonomies", {
    schema: {
      tags: ["bookmarks"],
    },
  }, async (_req, reply) => {
    try {
      return await fetchTaxonomies();
    }
    catch (err) {
      return handleError(err, reply);
    }
  });

  app.get("/api/bookmarks/taxonomies/:id/terms", {
    schema: {
      tags: ["bookmarks"],
      params: taxonomyParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    try {
      return await fetchTerms(id);
    }
    catch (err) {
      return handleError(err, reply);
    }
  });

  app.get("/api/bookmarks/vocabulary", {
    schema: {
      tags: ["bookmarks"],
    },
  }, async (_req, reply) => {
    try {
      return await fetchVocabulary();
    }
    catch (err) {
      return handleError(err, reply);
    }
  });
}

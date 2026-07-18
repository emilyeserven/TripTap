import type { FastifyInstance, FastifyReply } from "fastify";
import type { SentenceTermCategory } from "@sentence-bank/types";
import {
  BookmarksNotConfiguredError,
  BookmarksUnavailableError,
  createVocabularyTerm,
  fetchTags,
  fetchTaxonomies,
  fetchTerms,
  fetchVocabulary,
  getBookmark,
  getBookmarkImage,
  listBookmarkResources,
  listBookmarksByTag,
  listBookmarksForCategory,
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

const CATEGORY_ENUM = ["vocabulary", "grammar", "general", "resource"] as const;

const vocabularyQuery = {
  type: "object",
  properties: {
    category: {
      type: "string",
      enum: CATEGORY_ENUM,
    },
  },
} as const;

const createTermBody = {
  type: "object",
  additionalProperties: false,
  required: ["name"],
  properties: {
    name: {
      type: "string",
      minLength: 1,
    },
    category: {
      type: "string",
      enum: CATEGORY_ENUM,
    },
  },
} as const;

const recordsQuery = {
  type: "object",
  required: ["category"],
  properties: {
    category: {
      type: "string",
      enum: CATEGORY_ENUM,
    },
  },
} as const;

const recordParams = {
  type: "object",
  required: ["id"],
  properties: {
    id: {
      type: "string",
    },
  },
} as const;

const byTagParams = {
  type: "object",
  required: ["tagId"],
  properties: {
    tagId: {
      type: "string",
    },
  },
} as const;

const imageParams = {
  type: "object",
  required: ["bookmarkId", "imageId"],
  properties: {
    bookmarkId: {
      type: "string",
    },
    imageId: {
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
      querystring: vocabularyQuery,
    },
  }, async (req, reply) => {
    const {
      category,
    } = req.query as { category?: SentenceTermCategory };
    try {
      return await fetchVocabulary(category);
    }
    catch (err) {
      return handleError(err, reply);
    }
  });

  app.get("/api/bookmarks/records", {
    schema: {
      tags: ["bookmarks"],
      querystring: recordsQuery,
    },
  }, async (req, reply) => {
    const {
      category,
    } = req.query as { category: SentenceTermCategory };
    try {
      return await listBookmarksForCategory(category);
    }
    catch (err) {
      return handleError(err, reply);
    }
  });

  app.get("/api/bookmarks/resources", {
    schema: {
      tags: ["bookmarks"],
    },
  }, async (_req, reply) => {
    try {
      return await listBookmarkResources();
    }
    catch (err) {
      return handleError(err, reply);
    }
  });

  app.get("/api/bookmarks/by-tag/:tagId", {
    schema: {
      tags: ["bookmarks"],
      params: byTagParams,
    },
  }, async (req, reply) => {
    const {
      tagId,
    } = req.params as { tagId: string };
    try {
      return await listBookmarksByTag(tagId);
    }
    catch (err) {
      return handleError(err, reply);
    }
  });

  app.get("/api/bookmarks/:bookmarkId/images/:imageId", {
    schema: {
      tags: ["bookmarks"],
      params: imageParams,
    },
  }, async (req, reply) => {
    const {
      bookmarkId, imageId,
    } = req.params as { bookmarkId: string;
      imageId: string; };
    const qIndex = req.url.indexOf("?");
    const query = qIndex >= 0 ? req.url.slice(qIndex) : "";
    try {
      const image = await getBookmarkImage(bookmarkId, imageId, query);
      reply.header("Content-Type", image.contentType);
      reply.header("Cache-Control", "private, max-age=86400");
      return reply.send(image.body);
    }
    catch (err) {
      return handleError(err, reply);
    }
  });

  app.get("/api/bookmarks/records/:id", {
    schema: {
      tags: ["bookmarks"],
      params: recordParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    try {
      const record = await getBookmark(id);
      if (!record) return reply.code(404).send({
        message: "Bookmark not found",
      });
      return record;
    }
    catch (err) {
      return handleError(err, reply);
    }
  });

  app.post("/api/bookmarks/terms", {
    schema: {
      tags: ["bookmarks"],
      body: createTermBody,
    },
  }, async (req, reply) => {
    const {
      name, category,
    } = req.body as { name: string;
      category?: SentenceTermCategory; };
    try {
      return await createVocabularyTerm(name, category);
    }
    catch (err) {
      return handleError(err, reply);
    }
  });
}

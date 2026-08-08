/**
 * The example-sentence search route, shared by the Renshuu and Tatoeba proxies.
 *
 * Both are the same endpoint over a different upstream: one GET taking `query` + `limit`, forwarding
 * to a service, and mapping an upstream failure through {@link handleUpstreamError}. The two route
 * files were byte-identical apart from the path, the Swagger tag, and which `searchExampleSentences`
 * they imported — including the query schema's `limit` bounds, which is exactly the kind of detail
 * that drifts between copies.
 */

import type { FastifyInstance } from "fastify";

import { handleUpstreamError } from "@/routes/upstream-errors";

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

/** Register `GET <path>` as an example-sentence lookup against `search`. */
export function exampleSearchRoute(
  app: FastifyInstance,
  options: {
    /** The full route path, e.g. `/api/renshuu/search`. */
    path: string;
    /** The Swagger tag the endpoint is grouped under. */
    tag: string;
    /** The upstream lookup; upstream errors are mapped to 503/502 by the caller-shared handler. */
    search: (query: string, limit?: number) => Promise<unknown>;
  },
): void {
  app.get(options.path, {
    schema: {
      tags: [options.tag],
      querystring: searchQuery,
    },
  }, async (req, reply) => {
    const {
      query, limit,
    } = req.query as { query: string;
      limit?: number; };
    try {
      return await options.search(query, limit);
    }
    catch (err) {
      return handleUpstreamError(err, reply);
    }
  });
}

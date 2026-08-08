import type { FastifyInstance } from "fastify";
import { exampleSearchRoute } from "@/routes/example-search";
import { searchExampleSentences } from "@/services/renshuu";

/**
 * Renshuu proxy routes, mounted under `/api/renshuu`. Forwards an example-sentence lookup to
 * `api.renshuu.org` with the learner's stored API key so the browser never sees the key. Returns 503
 * when no key is configured, 502 when the host is unreachable or rejects the key.
 */
export async function renshuuRoutes(app: FastifyInstance): Promise<void> {
  exampleSearchRoute(app, {
    path: "/api/renshuu/search",
    tag: "renshuu",
    search: searchExampleSentences,
  });
}

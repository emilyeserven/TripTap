import type { FastifyInstance } from "fastify";
import { exampleSearchRoute } from "@/routes/example-search";
import { searchExampleSentences } from "@/services/tatoeba";

/**
 * Tatoeba proxy routes, mounted under `/api/tatoeba`. Forwards an example-sentence lookup to
 * `api.tatoeba.org` so the browser never reaches it directly. An unreachable host returns 502.
 */
export async function tatoebaRoutes(app: FastifyInstance): Promise<void> {
  exampleSearchRoute(app, {
    path: "/api/tatoeba/search",
    tag: "tatoeba",
    search: searchExampleSentences,
  });
}

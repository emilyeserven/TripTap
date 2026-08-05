import type { FastifyInstance } from "fastify";
import { getTermUsages } from "@/services/term-usage";

const termParams = {
  type: "object",
  required: ["id"],
  properties: {
    id: {
      type: "string",
    },
  },
} as const;

/**
 * Cross-feature term usage, mounted under `/api/terms`. One request answers "what have I done with
 * this tag?" across sentences, my sentences, practice, writings, question sheets and the
 * listening/shadowing sessions — previously only answerable by fetching every feature's list and
 * filtering in the browser.
 *
 * The id is a bookmarks-app term id (not a local uuid), so it is validated as a plain string.
 */
export async function termUsageRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/terms/:id/usages", {
    schema: {
      tags: ["terms"],
      params: termParams,
    },
  }, async (req) => {
    const {
      id,
    } = req.params as { id: string };
    return getTermUsages(id);
  });
}

import type { FastifyInstance } from "fastify";
import { getXpSummary } from "@/services/xp";

const summaryQuery = {
  type: "object",
  additionalProperties: false,
  properties: {
    days: {
      type: "integer",
      minimum: 1,
      maximum: 365,
      default: 7,
    },
  },
} as const;

/** Read-only XP rollup derived from the learner's content, mounted under `/api/xp`. */
export async function xpRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/xp/summary", {
    schema: {
      tags: ["xp"],
      querystring: summaryQuery,
    },
  }, async (req) => {
    const {
      days,
    } = req.query as { days: number };
    return getXpSummary(days);
  });
}

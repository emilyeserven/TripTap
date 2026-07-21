import type { FastifyInstance } from "fastify";
import { getActivity } from "@/services/activity";

const activityQuery = {
  type: "object",
  additionalProperties: false,
  properties: {
    days: {
      type: "integer",
      minimum: 1,
      maximum: 365,
      default: 30,
    },
    tzOffsetMinutes: {
      type: "integer",
      minimum: -840,
      maximum: 840,
      default: 0,
    },
  },
} as const;

/** Read-only daily activity feed derived from the learner's content, mounted under `/api/activity`. */
export async function activityRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/activity", {
    schema: {
      tags: ["activity"],
      querystring: activityQuery,
    },
  }, async (req) => {
    const {
      days, tzOffsetMinutes,
    } = req.query as { days: number;
      tzOffsetMinutes: number; };
    return getActivity(days, tzOffsetMinutes);
  });
}

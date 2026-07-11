import type { FastifyInstance } from "fastify";
import type { CreateSourceInput } from "@sentence-bank/types";
import { createSource, listSources } from "@/services/sources";

const createSourceBody = {
  type: "object",
  required: ["name"],
  additionalProperties: false,
  properties: {
    name: {
      type: "string",
      minLength: 1,
    },
    type: {
      type: ["string", "null"],
    },
    author: {
      type: ["string", "null"],
    },
    url: {
      type: ["string", "null"],
    },
    notes: {
      type: ["string", "null"],
    },
  },
} as const;

/** Routes for the source taxonomy, mounted under `/api/sources`. */
export async function sourceRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/sources", {
    schema: {
      tags: ["sources"],
    },
  }, async () => listSources());

  app.post("/api/sources", {
    schema: {
      tags: ["sources"],
      body: createSourceBody,
    },
  }, async (req, reply) => {
    const source = await createSource(req.body as CreateSourceInput);
    return reply.code(201).send(source);
  });
}

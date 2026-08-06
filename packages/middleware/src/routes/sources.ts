import type { FastifyInstance } from "fastify";
import type { CreateSourceInput, UpdateSourceInput } from "@sentence-bank/types";
import {
  createSource,
  deleteSource,
  InvalidSourceParentError,
  listSources,
  updateSource,
} from "@/services/sources";

const sourceFields = {
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
  /** The source this one nests inside (a page under an issue, an issue under a magazine). */
  parentId: {
    type: ["string", "null"],
    format: "uuid",
  },
} as const;

const createSourceBody = {
  type: "object",
  required: ["name"],
  additionalProperties: false,
  properties: sourceFields,
} as const;

const updateSourceBody = {
  type: "object",
  additionalProperties: false,
  properties: sourceFields,
} as const;

const sourceParams = {
  type: "object",
  required: ["id"],
  properties: {
    id: {
      type: "string",
      format: "uuid",
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
    try {
      const source = await createSource(req.body as CreateSourceInput);
      return reply.code(201).send(source);
    }
    catch (err) {
      if (err instanceof InvalidSourceParentError) {
        return reply.code(400).send({
          message: err.message,
        });
      }
      throw err;
    }
  });

  app.patch("/api/sources/:id", {
    schema: {
      tags: ["sources"],
      params: sourceParams,
      body: updateSourceBody,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    try {
      const source = await updateSource(id, req.body as UpdateSourceInput);
      if (!source) return reply.code(404).send({
        message: "Source not found",
      });
      return source;
    }
    catch (err) {
      if (err instanceof InvalidSourceParentError) {
        return reply.code(400).send({
          message: err.message,
        });
      }
      throw err;
    }
  });

  app.delete("/api/sources/:id", {
    schema: {
      tags: ["sources"],
      params: sourceParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const ok = await deleteSource(id);
    if (!ok) return reply.code(404).send({
      message: "Source not found",
    });
    return reply.code(204).send();
  });
}

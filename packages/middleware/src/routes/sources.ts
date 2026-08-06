import type { FastifyInstance, FastifyReply } from "fastify";
import type { CreateSourceInput, UpdateSourceInput } from "@sentence-bank/types";
import { idOf, notFound } from "@/routes/handlers";
import { idParams } from "@/routes/schemas/params";
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

/**
 * Map a rejected `parentId` to a 400, rethrowing anything else so genuine bugs still surface as
 * 500s. The hierarchy rules the FK can't express — the parent must exist, and must not sit inside
 * the source being re-parented — are the service's to enforce, and both read as bad input.
 */
function handleInvalidParent(err: unknown, reply: FastifyReply): FastifyReply {
  if (err instanceof InvalidSourceParentError) {
    return reply.code(400).send({
      message: err.message,
    });
  }
  throw err;
}

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
      return handleInvalidParent(err, reply);
    }
  });

  app.patch("/api/sources/:id", {
    schema: {
      tags: ["sources"],
      params: idParams,
      body: updateSourceBody,
    },
  }, async (req, reply) => {
    try {
      const source = await updateSource(idOf(req), req.body as UpdateSourceInput);
      if (!source) return notFound(reply, "Source");
      return source;
    }
    catch (err) {
      return handleInvalidParent(err, reply);
    }
  });

  app.delete("/api/sources/:id", {
    schema: {
      tags: ["sources"],
      params: idParams,
    },
  }, async (req, reply) => {
    const ok = await deleteSource(idOf(req));
    if (!ok) return notFound(reply, "Source");
    return reply.code(204).send();
  });
}

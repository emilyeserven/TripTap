import type { FastifyInstance } from "fastify";
import type { CreateMySentenceInput, UpdateMySentenceInput } from "@sentence-bank/types";
import {
  createMySentence,
  createMySentencesMany,
  deleteMySentence,
  getMySentence,
  listMySentences,
  updateMySentence,
} from "@/services/my-sentences";

const mySentenceParams = {
  type: "object",
  required: ["id"],
  properties: {
    id: {
      type: "string",
      format: "uuid",
    },
  },
} as const;

const listQuery = {
  type: "object",
  additionalProperties: false,
  properties: {
    practiceSentenceId: {
      type: "string",
      format: "uuid",
    },
    lessonId: {
      type: "string",
      format: "uuid",
    },
  },
} as const;

const reasonsSchema = {
  type: ["array", "null"],
  items: {
    type: "object",
    additionalProperties: false,
    required: ["categoryId"],
    properties: {
      categoryId: {
        type: "string",
      },
      subcategoryId: {
        type: ["string", "null"],
      },
      reasonId: {
        type: ["string", "null"],
      },
    },
  },
} as const;

const termsSchema = {
  type: ["array", "null"],
  items: {
    type: "object",
    additionalProperties: false,
    required: ["id", "name", "kind", "sourceId", "sourceLabel"],
    properties: {
      id: {
        type: "string",
      },
      name: {
        type: "string",
      },
      kind: {
        type: "string",
        enum: ["tag", "taxonomy"],
      },
      sourceId: {
        type: "string",
      },
      sourceLabel: {
        type: "string",
      },
      category: {
        type: "string",
        enum: ["vocabulary", "grammar", "general", "resource", "listening"],
      },
    },
  },
} as const;

const createMySentenceBody = {
  type: "object",
  required: ["text", "language"],
  additionalProperties: false,
  properties: {
    text: {
      type: "string",
      minLength: 1,
    },
    language: {
      type: "string",
      minLength: 1,
    },
    translation: {
      type: ["string", "null"],
    },
    practiceSentenceId: {
      type: ["string", "null"],
      format: "uuid",
    },
    writingId: {
      type: ["string", "null"],
      format: "uuid",
    },
    lessonId: {
      type: ["string", "null"],
      format: "uuid",
    },
    needsCorrection: {
      type: "boolean",
    },
    correction: {
      type: ["string", "null"],
    },
    actualMeaning: {
      type: ["string", "null"],
    },
    explanation: {
      type: ["string", "null"],
    },
    terms: termsSchema,
    reasons: reasonsSchema,
  },
} as const;

const updateMySentenceBody = {
  type: "object",
  additionalProperties: false,
  properties: {
    ...createMySentenceBody.properties,
  },
} as const;

const bulkMySentencesBody = {
  type: "object",
  required: ["mySentences"],
  additionalProperties: false,
  properties: {
    mySentences: {
      type: "array",
      items: createMySentenceBody,
    },
  },
} as const;

/** CRUD routes for my-sentences (learner-produced output), mounted under `/api/my-sentences`. */
export async function mySentenceRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/my-sentences", {
    schema: {
      tags: ["my-sentences"],
      querystring: listQuery,
    },
  }, async (req) => {
    const {
      practiceSentenceId, lessonId,
    } = req.query as { practiceSentenceId?: string;
      lessonId?: string; };
    return listMySentences({
      practiceSentenceId,
      lessonId,
    });
  });

  app.get("/api/my-sentences/:id", {
    schema: {
      tags: ["my-sentences"],
      params: mySentenceParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const mySentence = await getMySentence(id);
    if (!mySentence) return reply.code(404).send({
      message: "My sentence not found",
    });
    return mySentence;
  });

  app.post("/api/my-sentences", {
    schema: {
      tags: ["my-sentences"],
      body: createMySentenceBody,
    },
  }, async (req, reply) => {
    const input = req.body as CreateMySentenceInput;
    const created = await createMySentence(input);
    return reply.code(201).send(created);
  });

  app.post("/api/my-sentences/bulk", {
    schema: {
      tags: ["my-sentences"],
      body: bulkMySentencesBody,
    },
  }, async (req, reply) => {
    const {
      mySentences: inputs,
    } = req.body as { mySentences: CreateMySentenceInput[] };
    const created = await createMySentencesMany(inputs);
    return reply.code(201).send(created);
  });

  app.patch(
    "/api/my-sentences/:id",
    {
      schema: {
        tags: ["my-sentences"],
        params: mySentenceParams,
        body: updateMySentenceBody,
      },
    },
    async (req, reply) => {
      const {
        id,
      } = req.params as { id: string };
      const updated = await updateMySentence(id, req.body as UpdateMySentenceInput);
      if (!updated) return reply.code(404).send({
        message: "My sentence not found",
      });
      return updated;
    },
  );

  app.delete("/api/my-sentences/:id", {
    schema: {
      tags: ["my-sentences"],
      params: mySentenceParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const deleted = await deleteMySentence(id);
    if (!deleted) return reply.code(404).send({
      message: "My sentence not found",
    });
    return reply.code(204).send();
  });
}

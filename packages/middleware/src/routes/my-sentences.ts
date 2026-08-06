import type { FastifyInstance } from "fastify";
import { idOf, notFound } from "@/routes/handlers";
import { idParams, updateBodyOf } from "@/routes/schemas/params";
import type { CreateMySentenceInput, UpdateMySentenceInput } from "@sentence-bank/types";
import {
  createMySentence,
  createMySentencesMany,
  deleteMySentence,
  getMySentence,
  listMySentences,
  updateMySentence,
} from "@/services/my-sentences";
import { termsSchema } from "@/routes/schemas/terms";

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

const marksSchema = {
  type: ["array", "null"],
  items: {
    type: "object",
    additionalProperties: false,
    required: ["start", "end", "correct"],
    properties: {
      start: {
        type: "integer",
      },
      end: {
        type: "integer",
      },
      correct: {
        type: "boolean",
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
    incorrectGrammarTerms: termsSchema,
    reasons: reasonsSchema,
    marks: marksSchema,
    shadowingCandidate: {
      type: "boolean",
    },
  },
} as const;

const updateMySentenceBody = updateBodyOf(createMySentenceBody);

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
      params: idParams,
    },
  }, async (req, reply) => {
    const mySentence = await getMySentence(idOf(req));
    if (!mySentence) return notFound(reply, "My sentence");
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
        params: idParams,
        body: updateMySentenceBody,
      },
    },
    async (req, reply) => {
      const updated = await updateMySentence(idOf(req), req.body as UpdateMySentenceInput);
      if (!updated) return notFound(reply, "My sentence");
      return updated;
    },
  );

  app.delete("/api/my-sentences/:id", {
    schema: {
      tags: ["my-sentences"],
      params: idParams,
    },
  }, async (req, reply) => {
    const deleted = await deleteMySentence(idOf(req));
    if (!deleted) return notFound(reply, "My sentence");
    return reply.code(204).send();
  });
}

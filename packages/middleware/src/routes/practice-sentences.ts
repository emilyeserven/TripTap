import type { FastifyInstance } from "fastify";
import type {
  CreatePracticeSentenceInput,
  UpdatePracticeSentenceInput,
} from "@sentence-bank/types";
import {
  getVocabForPracticeSentence,
  setVocabForPracticeSentence,
} from "@/services/practice-sentence-vocab";
import {
  createPracticeSentence,
  createPracticeSentencesMany,
  deletePracticeSentence,
  getPracticeSentence,
  listPracticeSentences,
  updatePracticeSentence,
} from "@/services/practice-sentences";

const practiceSentenceParams = {
  type: "object",
  required: ["id"],
  properties: {
    id: {
      type: "string",
      format: "uuid",
    },
  },
} as const;

const wordsSchema = {
  type: ["array", "null"],
  items: {
    type: "object",
    additionalProperties: false,
    required: ["w", "r", "m"],
    properties: {
      w: {
        type: "string",
      },
      r: {
        type: "string",
      },
      m: {
        type: "string",
      },
    },
  },
} as const;

const grammarSchema = {
  type: ["array", "null"],
  items: {
    type: "object",
    additionalProperties: false,
    required: ["p", "n"],
    properties: {
      p: {
        type: "string",
      },
      n: {
        type: "string",
      },
    },
  },
} as const;

const passesSchema = {
  type: ["object", "null"],
  additionalProperties: false,
  properties: {
    read: {
      type: "boolean",
    },
    guess: {
      type: "boolean",
    },
    lookup: {
      type: "boolean",
    },
    produce: {
      type: "boolean",
    },
    card: {
      type: "boolean",
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
        enum: ["vocabulary", "grammar", "general", "resource"],
      },
    },
  },
} as const;

const createPracticeSentenceBody = {
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
    reading: {
      type: ["string", "null"],
    },
    translation: {
      type: ["string", "null"],
    },
    target: {
      type: ["string", "null"],
    },
    targetKind: {
      type: ["string", "null"],
      enum: ["word", "grammar", "idiom", "collocation", "reading", null],
    },
    comprehension: {
      type: ["string", "null"],
      enum: ["ready", "studying", "skip", null],
    },
    guess: {
      type: ["string", "null"],
    },
    literal: {
      type: ["string", "null"],
    },
    register: {
      type: ["string", "null"],
    },
    nuance: {
      type: ["string", "null"],
    },
    words: wordsSchema,
    grammar: grammarSchema,
    terms: termsSchema,
    passes: passesSchema,
    sourceId: {
      type: ["string", "null"],
      format: "uuid",
    },
    page: {
      type: ["string", "null"],
    },
    captureId: {
      type: ["string", "null"],
      format: "uuid",
    },
    sentenceId: {
      type: ["string", "null"],
      format: "uuid",
    },
    needsCorrection: {
      type: "boolean",
    },
    correction: {
      type: ["string", "null"],
    },
  },
} as const;

const updatePracticeSentenceBody = {
  type: "object",
  additionalProperties: false,
  properties: {
    ...createPracticeSentenceBody.properties,
  },
} as const;

const bulkPracticeSentencesBody = {
  type: "object",
  required: ["practiceSentences"],
  additionalProperties: false,
  properties: {
    practiceSentences: {
      type: "array",
      items: createPracticeSentenceBody,
    },
  },
} as const;

const setVocabBody = {
  type: "object",
  required: ["vocabIds"],
  additionalProperties: false,
  properties: {
    vocabIds: {
      type: "array",
      items: {
        type: "string",
        format: "uuid",
      },
    },
  },
} as const;

/** CRUD routes for practice sentences, mounted under `/api/practice-sentences`. */
export async function practiceSentenceRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/practice-sentences", {
    schema: {
      tags: ["practice-sentences"],
    },
  }, async () => listPracticeSentences());

  app.get("/api/practice-sentences/:id", {
    schema: {
      tags: ["practice-sentences"],
      params: practiceSentenceParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const practiceSentence = await getPracticeSentence(id);
    if (!practiceSentence) return reply.code(404).send({
      message: "Practice sentence not found",
    });
    return practiceSentence;
  });

  app.post("/api/practice-sentences", {
    schema: {
      tags: ["practice-sentences"],
      body: createPracticeSentenceBody,
    },
  }, async (req, reply) => {
    const input = req.body as CreatePracticeSentenceInput;
    const created = await createPracticeSentence(input);
    return reply.code(201).send(created);
  });

  app.post("/api/practice-sentences/bulk", {
    schema: {
      tags: ["practice-sentences"],
      body: bulkPracticeSentencesBody,
    },
  }, async (req, reply) => {
    const {
      practiceSentences: inputs,
    } = req.body as { practiceSentences: CreatePracticeSentenceInput[] };
    const created = await createPracticeSentencesMany(inputs);
    return reply.code(201).send(created);
  });

  app.get("/api/practice-sentences/:id/vocab", {
    schema: {
      tags: ["practice-sentences"],
      params: practiceSentenceParams,
    },
  }, async (req) => {
    const {
      id,
    } = req.params as { id: string };
    return getVocabForPracticeSentence(id);
  });

  app.put("/api/practice-sentences/:id/vocab", {
    schema: {
      tags: ["practice-sentences"],
      params: practiceSentenceParams,
      body: setVocabBody,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const {
      vocabIds,
    } = req.body as { vocabIds: string[] };
    const linked = await setVocabForPracticeSentence(id, vocabIds);
    if (!linked) return reply.code(404).send({
      message: "Practice sentence not found",
    });
    return linked;
  });

  app.patch(
    "/api/practice-sentences/:id",
    {
      schema: {
        tags: ["practice-sentences"],
        params: practiceSentenceParams,
        body: updatePracticeSentenceBody,
      },
    },
    async (req, reply) => {
      const {
        id,
      } = req.params as { id: string };
      const updated = await updatePracticeSentence(id, req.body as UpdatePracticeSentenceInput);
      if (!updated) return reply.code(404).send({
        message: "Practice sentence not found",
      });
      return updated;
    },
  );

  app.delete("/api/practice-sentences/:id", {
    schema: {
      tags: ["practice-sentences"],
      params: practiceSentenceParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const deleted = await deletePracticeSentence(id);
    if (!deleted) return reply.code(404).send({
      message: "Practice sentence not found",
    });
    return reply.code(204).send();
  });
}

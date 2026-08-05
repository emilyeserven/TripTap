import type { FastifyInstance } from "fastify";
import type {
  CreatePracticeSentenceInput,
  PracticeSentenceImportInput,
  UpdatePracticeSentenceInput,
} from "@sentence-bank/types";
import { practiceSentenceImportJsonSchema } from "@sentence-bank/types";
import {
  getVocabForPracticeSentence,
  setVocabForPracticeSentence,
} from "@/services/practice-sentence-vocab";
import {
  createPracticeSentence,
  createPracticeSentencesMany,
  deletePracticeSentence,
  deletePracticeSentenceImage,
  getPracticeSentence,
  getPracticeSentenceImage,
  listPracticeSentences,
  setPracticeSentenceImage,
  updatePracticeSentence,
} from "@/services/practice-sentences";
import { termsSchema } from "@/routes/schemas/terms";

/** A context screenshot is capped well below a capture image — 15 MiB. */
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

/** Map a pasted breakdown payload onto the create input (language defaults to Japanese). */
function importToCreateInput(input: PracticeSentenceImportInput): CreatePracticeSentenceInput {
  return {
    text: input.text,
    language: input.language?.trim() || "Japanese",
    reading: input.reading ?? null,
    translation: input.translation ?? null,
    target: input.target ?? null,
    targetKind: input.targetKind ?? null,
    guess: input.guess ?? null,
    literal: input.literal ?? null,
    register: input.register ?? null,
    nuance: input.nuance ?? null,
    words: input.words ?? null,
    grammar: input.grammar ?? null,
  };
}

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

  // Paste an AI's sentence breakdown as JSON → one practice card (body validated by the Zod-derived schema).
  app.post("/api/practice-sentences/import", {
    schema: {
      tags: ["practice-sentences"],
      body: practiceSentenceImportJsonSchema,
    },
  }, async (req, reply) => {
    const created = await createPracticeSentence(
      importToCreateInput(req.body as PracticeSentenceImportInput),
    );
    return reply.code(201).send(created);
  });

  // Upload (or replace) a context screenshot. Multipart; the field is named `file`.
  app.post("/api/practice-sentences/:id/image", {
    schema: {
      tags: ["practice-sentences"],
      params: practiceSentenceParams,
      consumes: ["multipart/form-data"],
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const file = await req.file({
      limits: {
        fileSize: MAX_IMAGE_BYTES,
      },
    });
    if (!file) return reply.code(400).send({
      message: "Expected an image upload",
    });
    const buffer = await file.toBuffer();
    if (file.file.truncated) return reply.code(413).send({
      message: "The image is too large to upload",
    });
    const stored = await setPracticeSentenceImage(
      id,
      buffer,
      file.mimetype || "application/octet-stream",
    );
    if (!stored) return reply.code(404).send({
      message: "Practice sentence not found",
    });
    // Return the sentence (now `hasImage: true`) so the client can refresh its cache.
    return getPracticeSentence(id);
  });

  // Stream the context screenshot for the <img>.
  app.get("/api/practice-sentences/:id/image", {
    schema: {
      tags: ["practice-sentences"],
      params: practiceSentenceParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const img = await getPracticeSentenceImage(id);
    if (!img) return reply.code(404).send({
      message: "No screenshot for this practice sentence",
    });
    reply.header("Content-Type", img.mime ?? "application/octet-stream");
    reply.header("Cache-Control", "private, max-age=86400");
    return reply.send(img.image);
  });

  app.delete("/api/practice-sentences/:id/image", {
    schema: {
      tags: ["practice-sentences"],
      params: practiceSentenceParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const deleted = await deletePracticeSentenceImage(id);
    if (!deleted) return reply.code(404).send({
      message: "No screenshot for this practice sentence",
    });
    return reply.code(204).send();
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

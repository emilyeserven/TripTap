import type { FastifyInstance } from "fastify";
import { idOf, notFound, sendMedia } from "@/routes/handlers";
import type {
  CreateSentenceInput,
  SentenceImportInput,
  SentenceKind,
  UpdateSentenceInput,
} from "@sentence-bank/types";
import { idParams } from "@/routes/schemas/params";
import { getVocabForSentence, setVocabForSentence } from "@/services/vocab-links";
import {
  backfillFurigana,
  createSentence,
  createSentencesMany,
  deleteSentence,
  deleteSentenceImage,
  getSentence,
  getSentenceImage,
  getSentenceMedia,
  listSentences,
  regenerateSentenceFurigana,
  type SentenceFilters,
  setSentenceImage,
  updateSentence,
} from "@/services/sentences";
import { handleUpstreamError } from "@/routes/upstream-errors";
import {
  createSentenceJsonSchema,
  SENTENCE_KINDS,
  sentenceImportJsonSchema,
  sentenceReadingJsonSchema,
} from "@sentence-bank/types";

/** An inline context screenshot is capped well below a capture image — 15 MiB. */
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

const createSentenceBody = createSentenceJsonSchema;

const updateSentenceBody = {
  type: "object",
  additionalProperties: false,
  properties: {
    ...createSentenceBody.properties,
    // A manual furigana override (clears/edits the generated reading).
    reading: sentenceReadingJsonSchema,
  },
} as const;

const bulkSentencesBody = {
  type: "object",
  required: ["sentences"],
  additionalProperties: false,
  properties: {
    sentences: {
      type: "array",
      items: createSentenceBody,
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

const listQuery = {
  type: "object",
  additionalProperties: false,
  properties: {
    // One kind or a comma-separated set ("mine", "bank,practice"). Omitted = all kinds.
    kind: {
      type: "string",
      pattern: "^(bank|mine|practice)(,(bank|mine|practice))*$",
    },
    derivedFromId: {
      type: "string",
      format: "uuid",
    },
    lessonId: {
      type: "string",
      format: "uuid",
    },
    writingId: {
      type: "string",
      format: "uuid",
    },
    captureId: {
      type: "string",
      format: "uuid",
    },
    needsCorrection: {
      type: "boolean",
    },
    shadowingCandidate: {
      type: "boolean",
    },
  },
} as const;

interface ListQuery {
  kind?: string;
  derivedFromId?: string;
  lessonId?: string;
  writingId?: string;
  captureId?: string;
  needsCorrection?: boolean;
  shadowingCandidate?: boolean;
}

/** Map the query string onto the service's filter shape. */
function toFilters(query: ListQuery): SentenceFilters {
  return {
    kinds: query.kind?.split(",").filter((k): k is SentenceKind =>
      (SENTENCE_KINDS as readonly string[]).includes(k)),
    derivedFromId: query.derivedFromId,
    lessonId: query.lessonId,
    writingId: query.writingId,
    captureId: query.captureId,
    needsCorrection: query.needsCorrection,
    shadowingCandidate: query.shadowingCandidate,
  };
}

/** Map a pasted breakdown payload onto the create input (language defaults to Japanese). */
function importToCreateInput(input: SentenceImportInput): CreateSentenceInput {
  return {
    kind: "practice",
    text: input.text,
    language: input.language?.trim() || "Japanese",
    readingNote: input.readingNote ?? null,
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

/** CRUD routes for the unified sentences table, mounted under `/api/sentences`. */
export async function sentenceRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/sentences", {
    schema: {
      tags: ["sentences"],
      querystring: listQuery,
    },
  }, async req => listSentences(toFilters(req.query as ListQuery)));

  app.get("/api/sentences/:id", {
    schema: {
      tags: ["sentences"],
      params: idParams,
    },
  }, async (req, reply) => {
    const sentence = await getSentence(idOf(req));
    if (!sentence) return notFound(reply, "Sentence");
    return sentence;
  });

  app.get("/api/sentences/:id/audio", {
    schema: {
      tags: ["sentences"],
      params: idParams,
    },
  }, async (req, reply) => {
    try {
      const media = await getSentenceMedia(idOf(req), "audio");
      return sendMedia(reply, media, "No audio for this sentence");
    }
    catch (err) {
      return handleUpstreamError(err, reply);
    }
  });

  // The image endpoint serves both image systems: the object-storage image (Migaku-imported) when
  // the row has a key, otherwise the inline screenshot from `sentence_images`.
  app.get("/api/sentences/:id/image", {
    schema: {
      tags: ["sentences"],
      params: idParams,
    },
  }, async (req, reply) => {
    try {
      const img = await getSentenceImage(idOf(req));
      if (!img) return reply.code(404).send({
        message: "No image for this sentence",
      });
      reply.header("Content-Type", img.mime ?? "application/octet-stream");
      reply.header("Cache-Control", "private, max-age=86400");
      return reply.send(img.image);
    }
    catch (err) {
      return handleUpstreamError(err, reply);
    }
  });

  // Upload (or replace) an inline context screenshot. Multipart; the field is named `file`.
  app.post("/api/sentences/:id/image", {
    schema: {
      tags: ["sentences"],
      params: idParams,
      consumes: ["multipart/form-data"],
    },
  }, async (req, reply) => {
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
    const stored = await setSentenceImage(
      idOf(req),
      buffer,
      file.mimetype || "application/octet-stream",
    );
    if (!stored) return notFound(reply, "Sentence");
    // Return the sentence (now `hasImage: true`) so the client can refresh its cache.
    return getSentence(idOf(req));
  });

  app.delete("/api/sentences/:id/image", {
    schema: {
      tags: ["sentences"],
      params: idParams,
    },
  }, async (req, reply) => {
    const deleted = await deleteSentenceImage(idOf(req));
    if (!deleted) return reply.code(404).send({
      message: "No screenshot for this sentence",
    });
    return reply.code(204).send();
  });

  app.post("/api/sentences", {
    schema: {
      tags: ["sentences"],
      body: createSentenceBody,
    },
  }, async (req, reply) => {
    const input = req.body as CreateSentenceInput;
    const sentence = await createSentence(input);
    return reply.code(201).send(sentence);
  });

  app.post("/api/sentences/bulk", {
    schema: {
      tags: ["sentences"],
      body: bulkSentencesBody,
    },
  }, async (req, reply) => {
    const {
      sentences: inputs,
    } = req.body as { sentences: CreateSentenceInput[] };
    const created = await createSentencesMany(inputs);
    return reply.code(201).send(created);
  });

  // Paste an AI's sentence breakdown as JSON → one practice-kind sentence (Zod-derived body schema).
  app.post("/api/sentences/import", {
    schema: {
      tags: ["sentences"],
      body: sentenceImportJsonSchema,
    },
  }, async (req, reply) => {
    const created = await createSentence(
      importToCreateInput(req.body as SentenceImportInput),
    );
    return reply.code(201).send(created);
  });

  app.post("/api/sentences/furigana/backfill", {
    schema: {
      tags: ["sentences"],
    },
  }, async () => backfillFurigana());

  app.post("/api/sentences/:id/furigana", {
    schema: {
      tags: ["sentences"],
      params: idParams,
    },
  }, async (req, reply) => {
    const sentence = await regenerateSentenceFurigana(idOf(req));
    if (!sentence) return notFound(reply, "Sentence");
    return sentence;
  });

  app.get("/api/sentences/:id/vocab", {
    schema: {
      tags: ["sentences"],
      params: idParams,
    },
  }, async (req) => {
    return getVocabForSentence(idOf(req));
  });

  app.put("/api/sentences/:id/vocab", {
    schema: {
      tags: ["sentences"],
      params: idParams,
      body: setVocabBody,
    },
  }, async (req, reply) => {
    const {
      vocabIds,
    } = req.body as { vocabIds: string[] };
    const linked = await setVocabForSentence(idOf(req), vocabIds);
    if (!linked) return notFound(reply, "Sentence");
    return linked;
  });

  app.patch(
    "/api/sentences/:id",
    {
      schema: {
        tags: ["sentences"],
        params: idParams,
        body: updateSentenceBody,
      },
    },
    async (req, reply) => {
      const sentence = await updateSentence(idOf(req), req.body as UpdateSentenceInput);
      if (!sentence) return notFound(reply, "Sentence");
      return sentence;
    },
  );

  app.delete("/api/sentences/:id", {
    schema: {
      tags: ["sentences"],
      params: idParams,
    },
  }, async (req, reply) => {
    const deleted = await deleteSentence(idOf(req));
    if (!deleted) return notFound(reply, "Sentence");
    return reply.code(204).send();
  });
}

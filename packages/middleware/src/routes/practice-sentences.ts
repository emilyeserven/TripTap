import type { FastifyInstance } from "fastify";
import { idOf, notFound } from "@/routes/handlers";
import { idParams, updateBodyOf } from "@/routes/schemas/params";
import type {
  CreatePracticeSentenceInput,
  CreateSentenceInput,
  PracticeSentence,
  PracticeSentenceImportInput,
  Sentence,
  UpdatePracticeSentenceInput,
} from "@sentence-bank/types";
import {
  createPracticeSentenceJsonSchema,
  practiceSentenceImportJsonSchema,
} from "@sentence-bank/types";
import { getVocabForSentence, setVocabForSentence } from "@/services/vocab-links";
import {
  createSentence,
  createSentencesMany,
  deleteSentence,
  deleteSentenceImage,
  getSentence,
  getSentenceImage,
  listSentences,
  setSentenceImage,
  updateSentence,
} from "@/services/sentences";

/**
 * Legacy wrapper over the unified sentences service (kind `practice`), keeping the pre-merge
 * `/api/practice-sentences` wire contract alive until the client has moved to
 * `/api/sentences?kind=practice`. The only translation is the lineage column: the old `sentenceId`
 * (the bank sentence this card was mined from) is the unified `derivedFromId`. Delete this file
 * (and the legacy types) once the client is migrated.
 */

/** A context screenshot is capped well below a capture image — 15 MiB. */
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

/** Unified sentence → legacy `PracticeSentence` wire shape. */
function toLegacy(s: Sentence): PracticeSentence {
  return {
    id: s.id,
    text: s.text,
    readingNote: s.readingNote,
    reading: s.reading,
    readingError: s.readingError,
    translation: s.translation,
    language: s.language,
    target: s.target,
    targetKind: s.targetKind,
    comprehension: s.comprehension,
    guess: s.guess,
    literal: s.literal,
    register: s.register,
    nuance: s.nuance,
    words: s.words,
    grammar: s.grammar,
    terms: s.terms,
    passes: s.passes,
    sourceId: s.sourceId,
    page: s.page,
    captureId: s.captureId,
    sentenceId: s.derivedFromId,
    needsCorrection: s.needsCorrection,
    correction: s.correction,
    hasImage: s.hasImage,
    createdAt: s.createdAt,
  };
}

/** Legacy create payload → unified create input. */
function fromLegacyCreate(input: CreatePracticeSentenceInput): CreateSentenceInput {
  const {
    sentenceId, ...rest
  } = input;
  return {
    ...rest,
    kind: "practice",
    derivedFromId: sentenceId ?? null,
  };
}

/** Legacy update payload → unified update input (only remaps keys that are present). */
function fromLegacyUpdate(input: UpdatePracticeSentenceInput) {
  const {
    sentenceId, ...rest
  } = input;
  return {
    ...rest,
    ...(sentenceId !== undefined
      ? {
        derivedFromId: sentenceId,
      }
      : {}),
  };
}

/** Fetch one sentence, treating non-practice kinds as absent (the legacy routes' 404 semantics). */
async function getPractice(id: string): Promise<Sentence | null> {
  const s = await getSentence(id);
  return s && s.kind === "practice" ? s : null;
}

/** Map a pasted breakdown payload onto the create input (language defaults to Japanese). */
function importToCreateInput(input: PracticeSentenceImportInput): CreateSentenceInput {
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

const createPracticeSentenceBody = createPracticeSentenceJsonSchema;

const updatePracticeSentenceBody = updateBodyOf(createPracticeSentenceBody);

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

/** Legacy CRUD routes for practice sentences, mounted under `/api/practice-sentences`. */
export async function practiceSentenceRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/practice-sentences", {
    schema: {
      tags: ["practice-sentences"],
    },
  }, async () => {
    const rows = await listSentences({
      kinds: ["practice"],
    });
    return rows.map(toLegacy);
  });

  app.get("/api/practice-sentences/:id", {
    schema: {
      tags: ["practice-sentences"],
      params: idParams,
    },
  }, async (req, reply) => {
    const practiceSentence = await getPractice(idOf(req));
    if (!practiceSentence) return notFound(reply, "Practice sentence");
    return toLegacy(practiceSentence);
  });

  app.post("/api/practice-sentences", {
    schema: {
      tags: ["practice-sentences"],
      body: createPracticeSentenceBody,
    },
  }, async (req, reply) => {
    const input = req.body as CreatePracticeSentenceInput;
    const created = await createSentence(fromLegacyCreate(input));
    return reply.code(201).send(toLegacy(created));
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
    const created = await createSentencesMany(inputs.map(fromLegacyCreate));
    return reply.code(201).send(created.map(toLegacy));
  });

  // Paste an AI's sentence breakdown as JSON → one practice card (body validated by the Zod-derived schema).
  app.post("/api/practice-sentences/import", {
    schema: {
      tags: ["practice-sentences"],
      body: practiceSentenceImportJsonSchema,
    },
  }, async (req, reply) => {
    const created = await createSentence(
      importToCreateInput(req.body as PracticeSentenceImportInput),
    );
    return reply.code(201).send(toLegacy(created));
  });

  // Upload (or replace) a context screenshot. Multipart; the field is named `file`.
  app.post("/api/practice-sentences/:id/image", {
    schema: {
      tags: ["practice-sentences"],
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
    if (!stored) return notFound(reply, "Practice sentence");
    // Return the sentence (now `hasImage: true`) so the client can refresh its cache.
    const refreshed = await getPractice(idOf(req));
    return refreshed ? toLegacy(refreshed) : notFound(reply, "Practice sentence");
  });

  // Stream the context screenshot for the <img>.
  app.get("/api/practice-sentences/:id/image", {
    schema: {
      tags: ["practice-sentences"],
      params: idParams,
    },
  }, async (req, reply) => {
    const img = await getSentenceImage(idOf(req));
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
      params: idParams,
    },
  }, async (req, reply) => {
    const deleted = await deleteSentenceImage(idOf(req));
    if (!deleted) return reply.code(404).send({
      message: "No screenshot for this practice sentence",
    });
    return reply.code(204).send();
  });

  app.get("/api/practice-sentences/:id/vocab", {
    schema: {
      tags: ["practice-sentences"],
      params: idParams,
    },
  }, async (req) => {
    return getVocabForSentence(idOf(req));
  });

  app.put("/api/practice-sentences/:id/vocab", {
    schema: {
      tags: ["practice-sentences"],
      params: idParams,
      body: setVocabBody,
    },
  }, async (req, reply) => {
    const {
      vocabIds,
    } = req.body as { vocabIds: string[] };
    const linked = await setVocabForSentence(idOf(req), vocabIds);
    if (!linked) return notFound(reply, "Practice sentence");
    return linked;
  });

  app.patch(
    "/api/practice-sentences/:id",
    {
      schema: {
        tags: ["practice-sentences"],
        params: idParams,
        body: updatePracticeSentenceBody,
      },
    },
    async (req, reply) => {
      if (!(await getPractice(idOf(req)))) return notFound(reply, "Practice sentence");
      const updated = await updateSentence(
        idOf(req),
        fromLegacyUpdate(req.body as UpdatePracticeSentenceInput),
      );
      if (!updated) return notFound(reply, "Practice sentence");
      return toLegacy(updated);
    },
  );

  app.delete("/api/practice-sentences/:id", {
    schema: {
      tags: ["practice-sentences"],
      params: idParams,
    },
  }, async (req, reply) => {
    if (!(await getPractice(idOf(req)))) return notFound(reply, "Practice sentence");
    const deleted = await deleteSentence(idOf(req));
    if (!deleted) return notFound(reply, "Practice sentence");
    return reply.code(204).send();
  });
}

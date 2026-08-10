import type { FastifyInstance } from "fastify";
import { idOf, notFound } from "@/routes/handlers";
import { idParams, updateBodyOf } from "@/routes/schemas/params";
import type {
  CreateMySentenceInput,
  CreateSentenceInput,
  MySentence,
  Sentence,
  UpdateMySentenceInput,
} from "@sentence-bank/types";
import {
  createSentence,
  createSentencesMany,
  deleteSentence,
  getSentence,
  listSentences,
  updateSentence,
} from "@/services/sentences";
import { createMySentenceJsonSchema } from "@sentence-bank/types";

/**
 * Legacy wrapper over the unified sentences service (kind `mine`), keeping the pre-merge
 * `/api/my-sentences` wire contract alive until the client has moved to `/api/sentences?kind=mine`.
 * The only translation is the lineage column: the old `practiceSentenceId` is the unified
 * `derivedFromId`. Delete this file (and the legacy types) once the client is migrated.
 */

/** Unified sentence → legacy `MySentence` wire shape. */
function toLegacy(s: Sentence): MySentence {
  return {
    id: s.id,
    text: s.text,
    translation: s.translation,
    reading: s.reading,
    readingError: s.readingError,
    language: s.language,
    practiceSentenceId: s.derivedFromId,
    writingId: s.writingId,
    lessonId: s.lessonId,
    needsCorrection: s.needsCorrection,
    correction: s.correction,
    actualMeaning: s.actualMeaning,
    explanation: s.explanation,
    terms: s.terms,
    incorrectGrammarTerms: s.incorrectGrammarTerms,
    reasons: s.reasons,
    marks: s.marks,
    shadowingCandidate: s.shadowingCandidate,
    createdAt: s.createdAt,
  };
}

/** Legacy create payload → unified create input. */
function fromLegacyCreate(input: CreateMySentenceInput): CreateSentenceInput {
  const {
    practiceSentenceId, ...rest
  } = input;
  return {
    ...rest,
    kind: "mine",
    derivedFromId: practiceSentenceId ?? null,
  };
}

/** Legacy update payload → unified update input (only remaps keys that are present). */
function fromLegacyUpdate(input: UpdateMySentenceInput) {
  const {
    practiceSentenceId, ...rest
  } = input;
  return {
    ...rest,
    ...(practiceSentenceId !== undefined
      ? {
        derivedFromId: practiceSentenceId,
      }
      : {}),
  };
}

/** Fetch one sentence, treating non-mine kinds as absent (the legacy routes' 404 semantics). */
async function getMine(id: string): Promise<Sentence | null> {
  const s = await getSentence(id);
  return s && s.kind === "mine" ? s : null;
}

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

const createMySentenceBody = createMySentenceJsonSchema;

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

/** Legacy CRUD routes for my-sentences, mounted under `/api/my-sentences`. */
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
    const rows = await listSentences({
      kinds: ["mine"],
      derivedFromId: practiceSentenceId,
      lessonId,
    });
    return rows.map(toLegacy);
  });

  app.get("/api/my-sentences/:id", {
    schema: {
      tags: ["my-sentences"],
      params: idParams,
    },
  }, async (req, reply) => {
    const mySentence = await getMine(idOf(req));
    if (!mySentence) return notFound(reply, "My sentence");
    return toLegacy(mySentence);
  });

  app.post("/api/my-sentences", {
    schema: {
      tags: ["my-sentences"],
      body: createMySentenceBody,
    },
  }, async (req, reply) => {
    const input = req.body as CreateMySentenceInput;
    const created = await createSentence(fromLegacyCreate(input));
    return reply.code(201).send(toLegacy(created));
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
    const created = await createSentencesMany(inputs.map(fromLegacyCreate));
    return reply.code(201).send(created.map(toLegacy));
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
      if (!(await getMine(idOf(req)))) return notFound(reply, "My sentence");
      const updated = await updateSentence(
        idOf(req),
        fromLegacyUpdate(req.body as UpdateMySentenceInput),
      );
      if (!updated) return notFound(reply, "My sentence");
      return toLegacy(updated);
    },
  );

  app.delete("/api/my-sentences/:id", {
    schema: {
      tags: ["my-sentences"],
      params: idParams,
    },
  }, async (req, reply) => {
    if (!(await getMine(idOf(req)))) return notFound(reply, "My sentence");
    const deleted = await deleteSentence(idOf(req));
    if (!deleted) return notFound(reply, "My sentence");
    return reply.code(204).send();
  });
}

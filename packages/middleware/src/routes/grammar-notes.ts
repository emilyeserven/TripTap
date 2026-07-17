import type { FastifyInstance } from "fastify";
import type {
  CreateGrammarNoteInput,
  UpdateGrammarNoteInput,
} from "@sentence-bank/types";
import {
  createGrammarNote,
  deleteGrammarNote,
  getGrammarNote,
  getGrammarNoteByTagId,
  GrammarNoteExistsError,
  listGrammarNotes,
  updateGrammarNote,
} from "@/services/grammar-notes";

const grammarNoteParams = {
  type: "object",
  required: ["id"],
  properties: {
    id: {
      type: "string",
      format: "uuid",
    },
  },
} as const;

const byTagParams = {
  type: "object",
  required: ["tagId"],
  properties: {
    tagId: {
      type: "string",
      minLength: 1,
    },
  },
} as const;

const constructionSchema = {
  type: "object",
  required: ["id", "pattern", "sentenceIds"],
  additionalProperties: false,
  properties: {
    id: {
      type: "string",
    },
    pattern: {
      type: "string",
    },
    note: {
      type: ["string", "null"],
    },
    sentenceIds: {
      type: "array",
      items: {
        type: "string",
      },
    },
  },
} as const;

const relationSchema = {
  type: "object",
  required: ["tagId", "tagName", "kind"],
  additionalProperties: false,
  properties: {
    tagId: {
      type: "string",
    },
    tagName: {
      type: "string",
    },
    kind: {
      type: "string",
      enum: ["similar", "antonym"],
    },
    note: {
      type: ["string", "null"],
    },
  },
} as const;

const resourceSchema = {
  type: "object",
  required: ["id", "title"],
  additionalProperties: false,
  properties: {
    id: {
      type: "string",
    },
    title: {
      type: "string",
    },
    url: {
      type: ["string", "null"],
    },
    note: {
      type: ["string", "null"],
    },
  },
} as const;

const createGrammarNoteBody = {
  type: "object",
  required: ["tagId", "tagName", "title"],
  additionalProperties: false,
  properties: {
    tagId: {
      type: "string",
      minLength: 1,
    },
    tagName: {
      type: "string",
      minLength: 1,
    },
    title: {
      type: "string",
      minLength: 1,
    },
    nuance: {
      type: ["string", "null"],
    },
    summary: {
      type: ["string", "null"],
    },
    constructions: {
      type: "array",
      items: constructionSchema,
    },
    relations: {
      type: "array",
      items: relationSchema,
    },
    resources: {
      type: "array",
      items: resourceSchema,
    },
  },
} as const;

const updateGrammarNoteBody = {
  type: "object",
  additionalProperties: false,
  properties: {
    tagName: {
      type: "string",
      minLength: 1,
    },
    title: {
      type: "string",
      minLength: 1,
    },
    nuance: {
      type: ["string", "null"],
    },
    summary: {
      type: ["string", "null"],
    },
    constructions: {
      type: "array",
      items: constructionSchema,
    },
    relations: {
      type: "array",
      items: relationSchema,
    },
    resources: {
      type: "array",
      items: resourceSchema,
    },
  },
} as const;

/** CRUD routes for grammar notes (rich notes on a grammar usage), mounted under `/api/grammar-notes`. */
export async function grammarNoteRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/grammar-notes", {
    schema: {
      tags: ["grammar-notes"],
    },
  }, async () => listGrammarNotes());

  app.get("/api/grammar-notes/by-tag/:tagId", {
    schema: {
      tags: ["grammar-notes"],
      params: byTagParams,
    },
  }, async (req, reply) => {
    const {
      tagId,
    } = req.params as { tagId: string };
    const note = await getGrammarNoteByTagId(tagId);
    if (!note) return reply.code(404).send({
      message: "Grammar note not found",
    });
    return note;
  });

  app.get("/api/grammar-notes/:id", {
    schema: {
      tags: ["grammar-notes"],
      params: grammarNoteParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const note = await getGrammarNote(id);
    if (!note) return reply.code(404).send({
      message: "Grammar note not found",
    });
    return note;
  });

  app.post("/api/grammar-notes", {
    schema: {
      tags: ["grammar-notes"],
      body: createGrammarNoteBody,
    },
  }, async (req, reply) => {
    const input = req.body as CreateGrammarNoteInput;
    try {
      const created = await createGrammarNote(input);
      return reply.code(201).send(created);
    }
    catch (err) {
      if (err instanceof GrammarNoteExistsError) {
        return reply.code(409).send({
          message: err.message,
        });
      }
      throw err;
    }
  });

  app.patch("/api/grammar-notes/:id", {
    schema: {
      tags: ["grammar-notes"],
      params: grammarNoteParams,
      body: updateGrammarNoteBody,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const updated = await updateGrammarNote(id, req.body as UpdateGrammarNoteInput);
    if (!updated) return reply.code(404).send({
      message: "Grammar note not found",
    });
    return updated;
  });

  app.delete("/api/grammar-notes/:id", {
    schema: {
      tags: ["grammar-notes"],
      params: grammarNoteParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const deleted = await deleteGrammarNote(id);
    if (!deleted) return reply.code(404).send({
      message: "Grammar note not found",
    });
    return reply.code(204).send();
  });
}

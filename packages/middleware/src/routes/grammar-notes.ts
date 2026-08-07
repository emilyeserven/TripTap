import type { FastifyInstance } from "fastify";
import { idOf, notFound } from "@/routes/handlers";
import { idParams } from "@/routes/schemas/params";
import type {
  CreateGrammarNoteInput,
  UpdateGrammarNoteInput,
} from "@sentence-bank/types";
import {
  createGrammarNoteJsonSchema,
  updateGrammarNoteJsonSchema,
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

const createGrammarNoteBody = createGrammarNoteJsonSchema;

const updateGrammarNoteBody = updateGrammarNoteJsonSchema;

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
    if (!note) return notFound(reply, "Grammar note");
    return note;
  });

  app.get("/api/grammar-notes/:id", {
    schema: {
      tags: ["grammar-notes"],
      params: idParams,
    },
  }, async (req, reply) => {
    const note = await getGrammarNote(idOf(req));
    if (!note) return notFound(reply, "Grammar note");
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
      params: idParams,
      body: updateGrammarNoteBody,
    },
  }, async (req, reply) => {
    const updated = await updateGrammarNote(idOf(req), req.body as UpdateGrammarNoteInput);
    if (!updated) return notFound(reply, "Grammar note");
    return updated;
  });

  app.delete("/api/grammar-notes/:id", {
    schema: {
      tags: ["grammar-notes"],
      params: idParams,
    },
  }, async (req, reply) => {
    const deleted = await deleteGrammarNote(idOf(req));
    if (!deleted) return notFound(reply, "Grammar note");
    return reply.code(204).send();
  });
}

import type { FastifyInstance, FastifyReply } from "fastify";
import type {
  CreateCultureNoteInput,
  UpdateCultureNoteInput,
} from "@sentence-bank/types";
import { createCultureNoteJsonSchema } from "@sentence-bank/types";
import { idOf, notFound } from "@/routes/handlers";
import { idParams, updateBodyOf } from "@/routes/schemas/params";
import {
  createCultureNote,
  CultureNoteBodyError,
  deleteCultureNote,
  getCultureNote,
  listCultureNotes,
  updateCultureNote,
} from "@/services/culture-notes";

const createCultureNoteBody = createCultureNoteJsonSchema;

const updateCultureNoteBody = updateBodyOf(createCultureNoteBody);

/** The at-least-one-body rule lives in the service (a JSON Schema can't guard a PATCH) — map it to 400. */
function handleMissingBody(reply: FastifyReply, err: unknown) {
  if (err instanceof CultureNoteBodyError) return reply.code(400).send({
    message: err.message,
  });
  throw err;
}

/** CRUD routes for user-authored culture notes, mounted under `/api/culture-notes`. */
export async function cultureNoteRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/culture-notes", {
    schema: {
      tags: ["culture-notes"],
    },
  }, async () => listCultureNotes());

  app.get("/api/culture-notes/:id", {
    schema: {
      tags: ["culture-notes"],
      params: idParams,
    },
  }, async (req, reply) => {
    const note = await getCultureNote(idOf(req));
    if (!note) return notFound(reply, "Culture note");
    return note;
  });

  app.post("/api/culture-notes", {
    schema: {
      tags: ["culture-notes"],
      body: createCultureNoteBody,
    },
  }, async (req, reply) => {
    try {
      const created = await createCultureNote(req.body as CreateCultureNoteInput);
      return await reply.code(201).send(created);
    }
    catch (err) {
      return handleMissingBody(reply, err);
    }
  });

  app.patch("/api/culture-notes/:id", {
    schema: {
      tags: ["culture-notes"],
      params: idParams,
      body: updateCultureNoteBody,
    },
  }, async (req, reply) => {
    try {
      const updated = await updateCultureNote(idOf(req), req.body as UpdateCultureNoteInput);
      if (!updated) return notFound(reply, "Culture note");
      return updated;
    }
    catch (err) {
      return handleMissingBody(reply, err);
    }
  });

  app.delete("/api/culture-notes/:id", {
    schema: {
      tags: ["culture-notes"],
      params: idParams,
    },
  }, async (req, reply) => {
    const deleted = await deleteCultureNote(idOf(req));
    if (!deleted) return notFound(reply, "Culture note");
    return reply.code(204).send();
  });
}

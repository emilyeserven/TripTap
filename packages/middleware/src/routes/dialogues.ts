import type { FastifyInstance } from "fastify";
import { idOf, notFound } from "@/routes/handlers";
import { idParams, updateBodyOf } from "@/routes/schemas/params";
import type { CreateDialogueInput, UpdateDialogueInput } from "@sentence-bank/types";
import { createDialogueJsonSchema } from "@sentence-bank/types";
import {
  createDialogue,
  deleteDialogue,
  getDialogue,
  listDialogues,
  updateDialogue,
} from "@/services/dialogues";

const createDialogueBody = createDialogueJsonSchema;

const updateDialogueBody = updateBodyOf(createDialogueBody);

/** CRUD routes for chat-transcript dialogues, mounted under `/api/dialogues`. */
export async function dialoguesRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/dialogues", {
    schema: {
      tags: ["dialogues"],
    },
  }, async () => listDialogues());

  app.get("/api/dialogues/:id", {
    schema: {
      tags: ["dialogues"],
      params: idParams,
    },
  }, async (req, reply) => {
    const dialogue = await getDialogue(idOf(req));
    if (!dialogue) return notFound(reply, "Dialogue");
    return dialogue;
  });

  app.post("/api/dialogues", {
    schema: {
      tags: ["dialogues"],
      body: createDialogueBody,
    },
  }, async (req, reply) => {
    const created = await createDialogue(req.body as CreateDialogueInput);
    return reply.code(201).send(created);
  });

  app.patch("/api/dialogues/:id", {
    schema: {
      tags: ["dialogues"],
      params: idParams,
      body: updateDialogueBody,
    },
  }, async (req, reply) => {
    const updated = await updateDialogue(idOf(req), req.body as UpdateDialogueInput);
    if (!updated) return notFound(reply, "Dialogue");
    return updated;
  });

  app.delete("/api/dialogues/:id", {
    schema: {
      tags: ["dialogues"],
      params: idParams,
    },
  }, async (req, reply) => {
    const deleted = await deleteDialogue(idOf(req));
    if (!deleted) return notFound(reply, "Dialogue");
    return reply.code(204).send();
  });
}

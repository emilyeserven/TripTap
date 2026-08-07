import type { FastifyInstance } from "fastify";
import { idOf, notFound } from "@/routes/handlers";
import { idParams, updateBodyOf } from "@/routes/schemas/params";
import type {
  CreateAnswerSheetInput,
  UpdateAnswerSheetInput,
} from "@sentence-bank/types";
import { createAnswerSheetJsonSchema } from "@sentence-bank/types";
import {
  createAnswerSheet,
  deleteAnswerSheet,
  getAnswerSheet,
  listAnswerSheets,
  updateAnswerSheet,
} from "@/services/answer-sheets";

const listQuery = {
  type: "object",
  additionalProperties: false,
  properties: {
    questionSheetId: {
      type: "string",
      format: "uuid",
    },
  },
} as const;

const createAnswerSheetBody = createAnswerSheetJsonSchema;

const updateAnswerSheetBody = updateBodyOf(createAnswerSheetBody);

/** CRUD routes for answer sheets (filled-in attempts at a question sheet), mounted under `/api/answer-sheets`. */
export async function answerSheetRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/answer-sheets", {
    schema: {
      tags: ["answer-sheets"],
      querystring: listQuery,
    },
  }, async (req) => {
    const {
      questionSheetId,
    } = req.query as { questionSheetId?: string };
    return listAnswerSheets({
      questionSheetId,
    });
  });

  app.get("/api/answer-sheets/:id", {
    schema: {
      tags: ["answer-sheets"],
      params: idParams,
    },
  }, async (req, reply) => {
    const sheet = await getAnswerSheet(idOf(req));
    if (!sheet) return notFound(reply, "Answer sheet");
    return sheet;
  });

  app.post("/api/answer-sheets", {
    schema: {
      tags: ["answer-sheets"],
      body: createAnswerSheetBody,
    },
  }, async (req, reply) => {
    const input = req.body as CreateAnswerSheetInput;
    const created = await createAnswerSheet(input);
    return reply.code(201).send(created);
  });

  app.patch("/api/answer-sheets/:id", {
    schema: {
      tags: ["answer-sheets"],
      params: idParams,
      body: updateAnswerSheetBody,
    },
  }, async (req, reply) => {
    const updated = await updateAnswerSheet(idOf(req), req.body as UpdateAnswerSheetInput);
    if (!updated) return notFound(reply, "Answer sheet");
    return updated;
  });

  app.delete("/api/answer-sheets/:id", {
    schema: {
      tags: ["answer-sheets"],
      params: idParams,
    },
  }, async (req, reply) => {
    const deleted = await deleteAnswerSheet(idOf(req));
    if (!deleted) return notFound(reply, "Answer sheet");
    return reply.code(204).send();
  });
}

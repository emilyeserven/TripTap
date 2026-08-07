import type { FastifyInstance } from "fastify";
import { idOf, notFound } from "@/routes/handlers";
import { idParams, updateBodyOf } from "@/routes/schemas/params";
import type {
  CreateDrillReasonCategoryInput,
  UpdateDrillReasonCategoryInput,
} from "@sentence-bank/types";
import { createDrillReasonCategoryJsonSchema } from "@sentence-bank/types";
import {
  createDrillReasonCategory,
  deleteDrillReasonCategory,
  getDrillReasonCategory,
  listDrillReasonCategories,
  updateDrillReasonCategory,
} from "@/services/drill-reason-categories";

/** Reasons attached directly to a category, with no subcategory. */

const createCategoryBody = createDrillReasonCategoryJsonSchema;

const updateCategoryBody = updateBodyOf(createCategoryBody);

/** CRUD routes for the Drill Buddy reason taxonomy, mounted under `/api/drill-reason-categories`. */
export async function drillReasonCategoryRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/drill-reason-categories", {
    schema: {
      tags: ["drill-reason-categories"],
    },
  }, async () => listDrillReasonCategories());

  app.get("/api/drill-reason-categories/:id", {
    schema: {
      tags: ["drill-reason-categories"],
      params: idParams,
    },
  }, async (req, reply) => {
    const category = await getDrillReasonCategory(idOf(req));
    if (!category) return notFound(reply, "Reason category");
    return category;
  });

  app.post("/api/drill-reason-categories", {
    schema: {
      tags: ["drill-reason-categories"],
      body: createCategoryBody,
    },
  }, async (req, reply) => {
    const input = req.body as CreateDrillReasonCategoryInput;
    const created = await createDrillReasonCategory(input);
    return reply.code(201).send(created);
  });

  app.patch("/api/drill-reason-categories/:id", {
    schema: {
      tags: ["drill-reason-categories"],
      params: idParams,
      body: updateCategoryBody,
    },
  }, async (req, reply) => {
    const updated = await updateDrillReasonCategory(idOf(req), req.body as UpdateDrillReasonCategoryInput);
    if (!updated) return notFound(reply, "Reason category");
    return updated;
  });

  app.delete("/api/drill-reason-categories/:id", {
    schema: {
      tags: ["drill-reason-categories"],
      params: idParams,
    },
  }, async (req, reply) => {
    const deleted = await deleteDrillReasonCategory(idOf(req));
    if (!deleted) return notFound(reply, "Reason category");
    return reply.code(204).send();
  });
}

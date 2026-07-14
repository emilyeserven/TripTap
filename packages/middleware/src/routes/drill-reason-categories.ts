import type { FastifyInstance } from "fastify";
import type {
  CreateDrillReasonCategoryInput,
  UpdateDrillReasonCategoryInput,
} from "@sentence-bank/types";
import {
  createDrillReasonCategory,
  deleteDrillReasonCategory,
  getDrillReasonCategory,
  listDrillReasonCategories,
  updateDrillReasonCategory,
} from "@/services/drill-reason-categories";

const categoryParams = {
  type: "object",
  required: ["id"],
  properties: {
    id: {
      type: "string",
      format: "uuid",
    },
  },
} as const;

const subcategoriesSchema = {
  type: ["array", "null"],
  items: {
    type: "object",
    additionalProperties: false,
    required: ["id", "name", "reasons"],
    properties: {
      id: {
        type: "string",
      },
      name: {
        type: "string",
      },
      reasons: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "name"],
          properties: {
            id: {
              type: "string",
            },
            name: {
              type: "string",
            },
          },
        },
      },
    },
  },
} as const;

const createCategoryBody = {
  type: "object",
  required: ["name"],
  additionalProperties: false,
  properties: {
    name: {
      type: "string",
      minLength: 1,
    },
    subcategories: subcategoriesSchema,
  },
} as const;

const updateCategoryBody = {
  type: "object",
  additionalProperties: false,
  properties: {
    ...createCategoryBody.properties,
  },
} as const;

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
      params: categoryParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const category = await getDrillReasonCategory(id);
    if (!category) return reply.code(404).send({
      message: "Reason category not found",
    });
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
      params: categoryParams,
      body: updateCategoryBody,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const updated = await updateDrillReasonCategory(id, req.body as UpdateDrillReasonCategoryInput);
    if (!updated) return reply.code(404).send({
      message: "Reason category not found",
    });
    return updated;
  });

  app.delete("/api/drill-reason-categories/:id", {
    schema: {
      tags: ["drill-reason-categories"],
      params: categoryParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const deleted = await deleteDrillReasonCategory(id);
    if (!deleted) return reply.code(404).send({
      message: "Reason category not found",
    });
    return reply.code(204).send();
  });
}

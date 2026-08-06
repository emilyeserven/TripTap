import type { FastifyInstance } from "fastify";
import { idOf, notFound } from "@/routes/handlers";
import { idParams } from "@/routes/schemas/params";
import type { CreateVocabInput, UpdateVocabInput } from "@sentence-bank/types";
import { createVocabJsonSchema } from "@sentence-bank/types";
import {
  createVocab,
  createVocabMany,
  deleteVocab,
  getSentencesForVocab,
  getVocabMedia,
  listVocab,
  updateVocab,
} from "@/services/vocab";
import { handleUpstreamError } from "@/routes/upstream-errors";

const createVocabBody = createVocabJsonSchema;

const bulkVocabBody = {
  type: "object",
  required: ["vocab"],
  additionalProperties: false,
  properties: {
    vocab: {
      type: "array",
      items: createVocabBody,
    },
  },
} as const;

const updateVocabBody = {
  type: "object",
  additionalProperties: false,
  properties: createVocabBody.properties,
} as const;

/** CRUD routes for the standalone vocab bank, mounted under `/api/vocab`. */
export async function vocabRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/vocab", {
    schema: {
      tags: ["vocab"],
    },
  }, async () => listVocab());

  for (const which of ["audio", "image"] as const) {
    app.get(`/api/vocab/:id/${which}`, {
      schema: {
        tags: ["vocab"],
        params: idParams,
      },
    }, async (req, reply) => {
      try {
        const media = await getVocabMedia(idOf(req), which);
        if (!media) return reply.code(404).send({
          message: `No ${which} for this vocab item`,
        });
        reply.header("Content-Type", media.contentType);
        reply.header("Cache-Control", "private, max-age=86400");
        return reply.send(media.body);
      }
      catch (err) {
        return handleUpstreamError(err, reply);
      }
    });
  }

  app.post("/api/vocab", {
    schema: {
      tags: ["vocab"],
      body: createVocabBody,
    },
  }, async (req, reply) => {
    const created = await createVocab(req.body as CreateVocabInput);
    return reply.code(201).send(created);
  });

  app.post("/api/vocab/bulk", {
    schema: {
      tags: ["vocab"],
      body: bulkVocabBody,
    },
  }, async (req, reply) => {
    const {
      vocab: inputs,
    } = req.body as { vocab: CreateVocabInput[] };
    const created = await createVocabMany(inputs);
    return reply.code(201).send(created);
  });

  app.get("/api/vocab/:id/sentences", {
    schema: {
      tags: ["vocab"],
      params: idParams,
    },
  }, async (req) => {
    return getSentencesForVocab(idOf(req));
  });

  app.patch("/api/vocab/:id", {
    schema: {
      tags: ["vocab"],
      params: idParams,
      body: updateVocabBody,
    },
  }, async (req, reply) => {
    const updated = await updateVocab(idOf(req), req.body as UpdateVocabInput);
    if (!updated) return notFound(reply, "Vocab");
    return updated;
  });

  app.delete("/api/vocab/:id", {
    schema: {
      tags: ["vocab"],
      params: idParams,
    },
  }, async (req, reply) => {
    const deleted = await deleteVocab(idOf(req));
    if (!deleted) return notFound(reply, "Vocab");
    return reply.code(204).send();
  });
}

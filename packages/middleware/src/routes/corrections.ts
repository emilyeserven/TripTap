import type { FastifyInstance } from "fastify";
import { idOf, notFound } from "@/routes/handlers";
import { idParams, updateBodyOf } from "@/routes/schemas/params";
import type {
  CorrectionImportKind,
  CreateCorrectionInput,
  ImportCorrectionsInput,
  TriageCorrectionInput,
  UpdateCorrectionInput,
} from "@sentence-bank/types";
import { CORRECTION_IMPORT_KINDS } from "@sentence-bank/types";
import {
  importCorrections,
  listImportCandidates,
} from "@/services/correction-import";
import {
  createCorrection,
  deleteCorrection,
  getCorrection,
  getCorrectionLog,
  grammarFailureStats,
  listCorrections,
  triageCorrection,
  TriageValidationError,
  updateCorrection,
} from "@/services/corrections";

/** The four triage buckets. */
const bucketEnum = ["slip", "rule_gap", "collocation", "register"] as const;

/** A persisted triage verdict, as embedded on a correction row. */
const triageSchema = {
  type: ["object", "null"],
  additionalProperties: false,
  required: ["bucket", "path", "triagedAt", "producedCardIds"],
  properties: {
    bucket: {
      type: "string",
      enum: bucketEnum,
    },
    path: {
      type: "array",
      items: {
        type: "string",
        enum: ["q1", "q2", "q3", "q4"],
      },
    },
    ruleTagKey: {
      type: ["string", "null"],
    },
    scene: {
      type: ["string", "null"],
    },
    triagedAt: {
      type: "string",
    },
    producedCardIds: {
      type: "array",
      items: {
        type: "string",
      },
    },
  },
} as const;

const importedFromSchema = {
  type: ["object", "null"],
  additionalProperties: false,
  required: ["kind", "id"],
  properties: {
    kind: {
      type: "string",
      enum: [...CORRECTION_IMPORT_KINDS],
    },
    id: {
      type: "string",
    },
  },
} as const;

const createCorrectionBody = {
  type: "object",
  required: ["original"],
  additionalProperties: false,
  properties: {
    original: {
      type: "string",
      minLength: 1,
    },
    // Null / omitted for a non-correction sentence added without a fix.
    corrected: {
      type: ["string", "null"],
    },
    context: {
      type: ["string", "null"],
    },
    correctorNote: {
      type: ["string", "null"],
    },
    source: {
      type: "string",
      enum: ["tutor", "native_speaker", "app", "self"],
    },
    lessonId: {
      type: ["string", "null"],
    },
    importedFrom: importedFromSchema,
    batchId: {
      type: ["string", "null"],
      format: "uuid",
    },
    triage: triageSchema,
  },
} as const;

const updateCorrectionBody = updateBodyOf(createCorrectionBody);

const triageBody = {
  type: "object",
  required: ["bucket", "path"],
  additionalProperties: false,
  properties: {
    bucket: {
      type: "string",
      enum: bucketEnum,
    },
    path: {
      type: "array",
      items: {
        type: "string",
        enum: ["q1", "q2", "q3", "q4"],
      },
    },
    ruleTagKey: {
      type: ["string", "null"],
    },
    scene: {
      type: ["string", "null"],
    },
  },
} as const;

const listCorrectionsQuery = {
  type: "object",
  properties: {
    untriaged: {
      type: "boolean",
    },
    batchId: {
      type: "string",
      format: "uuid",
    },
  },
} as const;

const grammarStatsQuery = {
  type: "object",
  required: ["grammarTagId"],
  properties: {
    grammarTagId: {
      type: "string",
      minLength: 1,
    },
  },
} as const;

// The importable sources come from the shared contract, so adding one is a types-only change.
const importKindEnum = [...CORRECTION_IMPORT_KINDS];

const importableQuery = {
  type: "object",
  required: ["kind"],
  properties: {
    kind: {
      type: "string",
      enum: importKindEnum,
    },
  },
} as const;

const importRefSchema = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "id"],
  properties: {
    kind: {
      type: "string",
      enum: importKindEnum,
    },
    id: {
      type: "string",
    },
  },
} as const;

const importBody = {
  type: "object",
  required: ["refs"],
  additionalProperties: false,
  properties: {
    refs: {
      type: "array",
      items: importRefSchema,
    },
    batchId: {
      type: ["string", "null"],
      format: "uuid",
    },
  },
} as const;

/** CRUD + triage + derived-log routes for corrections, mounted under `/api/corrections`. */
export async function correctionsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/corrections", {
    schema: {
      tags: ["corrections"],
      querystring: listCorrectionsQuery,
    },
  }, async (req) => {
    const {
      untriaged, batchId,
    } = req.query as { untriaged?: boolean;
      batchId?: string; };
    return listCorrections({
      untriaged,
      batchId,
    });
  });

  // Derived error log (static path — matched before `:id`).
  app.get("/api/corrections/log", {
    schema: {
      tags: ["corrections"],
    },
  }, async () => getCorrectionLog());

  // Failure history for one grammar tag — powers the "broken N times" badge on a grammar note.
  app.get("/api/corrections/grammar-stats", {
    schema: {
      tags: ["corrections"],
      querystring: grammarStatsQuery,
    },
  }, async (req) => {
    const {
      grammarTagId,
    } = req.query as { grammarTagId: string };
    return grammarFailureStats(grammarTagId);
  });

  // Not-yet-imported (original, corrected) pairs from existing entities, for the import picker.
  app.get("/api/corrections/importable", {
    schema: {
      tags: ["corrections"],
      querystring: importableQuery,
    },
  }, async (req) => {
    const {
      kind,
    } = req.query as { kind: CorrectionImportKind };
    return listImportCandidates(kind);
  });

  // Pull the selected existing corrections into the triage pipeline under one batch.
  app.post("/api/corrections/import", {
    schema: {
      tags: ["corrections"],
      body: importBody,
    },
  }, async (req, reply) => {
    const {
      refs, batchId,
    } = req.body as ImportCorrectionsInput;
    const created = await importCorrections(refs, batchId ?? undefined);
    return reply.code(201).send(created);
  });

  app.get("/api/corrections/:id", {
    schema: {
      tags: ["corrections"],
      params: idParams,
    },
  }, async (req, reply) => {
    const correction = await getCorrection(idOf(req));
    if (!correction) return notFound(reply, "Correction");
    return correction;
  });

  app.post("/api/corrections", {
    schema: {
      tags: ["corrections"],
      body: createCorrectionBody,
    },
  }, async (req, reply) => {
    const created = await createCorrection(req.body as CreateCorrectionInput);
    return reply.code(201).send(created);
  });

  // Apply a triage verdict. A `slip` deletes the correction (204); any other bucket returns it.
  app.post("/api/corrections/:id/triage", {
    schema: {
      tags: ["corrections"],
      params: idParams,
      body: triageBody,
    },
  }, async (req, reply) => {
    try {
      const result = await triageCorrection(idOf(req), req.body as TriageCorrectionInput);
      if (result === null) return notFound(reply, "Correction");
      if ("deleted" in result) return reply.code(204).send();
      return result;
    }
    catch (err) {
      if (err instanceof TriageValidationError) return reply.code(400).send({
        message: err.message,
      });
      throw err;
    }
  });

  app.patch(
    "/api/corrections/:id",
    {
      schema: {
        tags: ["corrections"],
        params: idParams,
        body: updateCorrectionBody,
      },
    },
    async (req, reply) => {
      const updated = await updateCorrection(idOf(req), req.body as UpdateCorrectionInput);
      if (!updated) return notFound(reply, "Correction");
      return updated;
    },
  );

  app.delete("/api/corrections/:id", {
    schema: {
      tags: ["corrections"],
      params: idParams,
    },
  }, async (req, reply) => {
    const deleted = await deleteCorrection(idOf(req));
    if (!deleted) return notFound(reply, "Correction");
    return reply.code(204).send();
  });
}

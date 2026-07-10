import type { FastifyInstance } from "fastify";
import type { UpdateOcrSettingsInput } from "@sentence-bank/types";
import { getOcrSettings, updateOcrSettings } from "@/services/settings";

const updateOcrSettingsBody = {
  type: "object",
  additionalProperties: false,
  properties: {
    ocrSpaceApiKey: {
      type: ["string", "null"],
    },
    googleVisionApiKey: {
      type: ["string", "null"],
    },
  },
} as const;

/**
 * Settings routes, mounted under `/api/settings`. Cloud OCR credentials are stored server-side; the
 * GET endpoint returns only a masked view (presence + a short hint), never the raw secrets.
 */
export async function settingsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/settings/ocr", {
    schema: {
      tags: ["settings"],
    },
  }, async () => getOcrSettings());

  app.patch("/api/settings/ocr", {
    schema: {
      tags: ["settings"],
      body: updateOcrSettingsBody,
    },
  }, async (req) => {
    return updateOcrSettings(req.body as UpdateOcrSettingsInput);
  });
}

import type { FastifyInstance } from "fastify";
import { OcrNotConfiguredError, OcrUnavailableError, runOcr } from "@/services/ocr";

/**
 * OCR route, mounted at `/api/ocr`. Accepts a `multipart/form-data` upload with a single `file`
 * field and proxies it to the external OCR service (`OCR_SERVICE_URL`). All recognition compute
 * happens off-box; this endpoint only forwards the image and relays the result.
 */
export async function ocrRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/ocr", {
    schema: {
      tags: ["ocr"],
      consumes: ["multipart/form-data"],
    },
  }, async (req, reply) => {
    const file = await req.file();
    if (!file) {
      return reply.code(400).send({
        message: "Expected an image file upload",
      });
    }

    const buffer = await file.toBuffer();

    try {
      const result = await runOcr(buffer, file.filename, file.mimetype);
      return result;
    }
    catch (err) {
      if (err instanceof OcrNotConfiguredError) {
        return reply.code(503).send({
          message: err.message,
        });
      }
      if (err instanceof OcrUnavailableError) {
        return reply.code(502).send({
          message: err.message,
        });
      }
      throw err;
    }
  });
}

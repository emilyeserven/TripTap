import type { FastifyInstance } from "fastify";
import type { CreateCaptureInput } from "@sentence-bank/types";
import { Jimp } from "jimp";
import {
  createCapture,
  deleteCapture,
  getCapture,
  getCaptureImage,
  listCaptures,
  updateCapture,
  type UpdateCaptureInput,
} from "@/services/captures";
import { listSentencesByCapture } from "@/services/sentences";
import { listVocabByCapture } from "@/services/vocab";

const captureParams = {
  type: "object",
  required: ["id"],
  properties: {
    id: {
      type: "string",
      format: "uuid",
    },
  },
} as const;

/** Read pixel dimensions from an image buffer; returns nulls for undecodable input (e.g. HEIC). */
async function readImageMeta(buffer: Buffer): Promise<{ width: number | null;
  height: number | null; }> {
  try {
    const image = await Jimp.read(buffer);
    return {
      width: image.width,
      height: image.height,
    };
  }
  catch {
    return {
      width: null,
      height: null,
    };
  }
}

function isValidPayload(input: CreateCaptureInput): boolean {
  return (
    typeof input.text === "string"
    && input.text.trim().length > 0
    && Array.isArray(input.blocks)
    && Array.isArray(input.engines)
  );
}

/**
 * Capture routes, mounted under `/api/captures`. A capture is created via `multipart/form-data`
 * with a JSON `payload` field (the OCR result + metadata) and an optional `file` field (the image).
 * The image is served from a dedicated endpoint so list/detail JSON never carries binary blobs.
 */
export async function captureRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/captures", {
    schema: {
      tags: ["captures"],
    },
  }, async () => listCaptures());

  app.get("/api/captures/:id", {
    schema: {
      tags: ["captures"],
      params: captureParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const capture = await getCapture(id);
    if (!capture) return reply.code(404).send({
      message: "Capture not found",
    });
    return capture;
  });

  app.get("/api/captures/:id/sentences", {
    schema: {
      tags: ["captures"],
      params: captureParams,
    },
  }, async (req) => {
    const {
      id,
    } = req.params as { id: string };
    return listSentencesByCapture(id);
  });

  app.get("/api/captures/:id/vocab", {
    schema: {
      tags: ["captures"],
      params: captureParams,
    },
  }, async (req) => {
    const {
      id,
    } = req.params as { id: string };
    return listVocabByCapture(id);
  });

  app.get("/api/captures/:id/image", {
    schema: {
      tags: ["captures"],
      params: captureParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const img = await getCaptureImage(id);
    if (!img) return reply.code(404).send({
      message: "Capture image not found",
    });
    reply.header("Content-Type", img.mime ?? "application/octet-stream");
    reply.header("Cache-Control", "private, max-age=86400");
    return reply.send(img.image);
  });

  app.post("/api/captures", {
    schema: {
      tags: ["captures"],
      consumes: ["multipart/form-data"],
    },
  }, async (req, reply) => {
    let payloadRaw: string | undefined;
    let imageBuffer: Buffer | undefined;
    let imageMime: string | null = null;

    for await (const part of req.parts()) {
      if (part.type === "file") {
        if (part.fieldname === "file") {
          imageBuffer = await part.toBuffer();
          imageMime = part.mimetype ?? null;
        }
        else {
          // Drain unexpected file parts so the request can complete.
          await part.toBuffer();
        }
      }
      else if (part.fieldname === "payload") {
        payloadRaw = part.value as string;
      }
    }

    if (!payloadRaw) {
      return reply.code(400).send({
        message: "Expected a `payload` field with the capture JSON",
      });
    }

    let input: CreateCaptureInput;
    try {
      input = JSON.parse(payloadRaw) as CreateCaptureInput;
    }
    catch {
      return reply.code(400).send({
        message: "`payload` must be valid JSON",
      });
    }

    if (!isValidPayload(input)) {
      return reply.code(400).send({
        message: "`payload` requires a non-empty text plus blocks[] and engines[]",
      });
    }

    const image = imageBuffer && imageBuffer.length > 0
      ? {
        buffer: imageBuffer,
        mime: imageMime,
        ...(await readImageMeta(imageBuffer)),
      }
      : null;

    const capture = await createCapture(input, image);
    return reply.code(201).send(capture);
  });

  app.patch("/api/captures/:id", {
    schema: {
      tags: ["captures"],
      params: captureParams,
      body: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: {
            type: ["string", "null"],
          },
          cleanedText: {
            type: ["string", "null"],
          },
          cleanedBlocks: {
            type: ["object", "null"],
            additionalProperties: false,
            required: ["lines", "groups", "ignoredLangs"],
            properties: {
              lines: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["id", "text", "lang", "role", "group"],
                  properties: {
                    id: {
                      type: "string",
                    },
                    text: {
                      type: "string",
                    },
                    lang: {
                      type: "string",
                    },
                    role: {
                      type: "string",
                      enum: ["text", "furigana", "translation", "structure", "ignore"],
                    },
                    group: {
                      type: "string",
                    },
                  },
                },
              },
              groups: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["id", "kind"],
                  properties: {
                    id: {
                      type: "string",
                    },
                    kind: {
                      type: "string",
                      enum: ["sentence", "vocab"],
                    },
                  },
                },
              },
              ignoredLangs: {
                type: "array",
                items: {
                  type: "string",
                },
              },
            },
          },
          notes: {
            type: ["string", "null"],
          },
          sourceId: {
            type: ["string", "null"],
            format: "uuid",
          },
          page: {
            type: ["string", "null"],
          },
          status: {
            type: "string",
            enum: ["new", "parsed"],
          },
        },
      },
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const capture = await updateCapture(id, req.body as UpdateCaptureInput);
    if (!capture) return reply.code(404).send({
      message: "Capture not found",
    });
    return capture;
  });

  app.delete("/api/captures/:id", {
    schema: {
      tags: ["captures"],
      params: captureParams,
    },
  }, async (req, reply) => {
    const {
      id,
    } = req.params as { id: string };
    const deleted = await deleteCapture(id);
    if (!deleted) return reply.code(404).send({
      message: "Capture not found",
    });
    return reply.code(204).send();
  });
}

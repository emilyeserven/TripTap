import { handleUpstreamError } from "@/routes/upstream-errors";
import type { RecognizeHandwritingInput } from "@sentence-bank/types";
import type { FastifyInstance } from "fastify";
import {
  recognizeHandwriting,
} from "@/services/handwriting";

const coordinates = {
  type: "array",
  minItems: 1,
  maxItems: 512,
  items: {
    type: "number",
  },
} as const;

/**
 * Bounded so a runaway canvas can't post megabytes of ink: a character is a few dozen strokes at
 * most, and the pad already thins out points that are within a couple of pixels of each other.
 */
const recognizeBody = {
  type: "object",
  required: ["width", "height", "strokes"],
  additionalProperties: false,
  properties: {
    width: {
      type: "number",
      exclusiveMinimum: 0,
    },
    height: {
      type: "number",
      exclusiveMinimum: 0,
    },
    strokes: {
      type: "array",
      minItems: 1,
      maxItems: 64,
      items: {
        type: "object",
        required: ["x", "y"],
        additionalProperties: false,
        properties: {
          x: coordinates,
          y: coordinates,
        },
      },
    },
    limit: {
      type: "integer",
      minimum: 1,
      maximum: 20,
    },
  },
} as const;

/**
 * Handwriting proxy routes, mounted under `/api/handwriting`. They forward drawn strokes to the
 * configured recognizer and return ranked candidate characters, so the browser never reaches the
 * upstream directly and the provider stays swappable. An unreachable host returns 502. POST rather
 * than GET because stroke data doesn't fit in a querystring.
 */
export async function handwritingRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/handwriting/recognize", {
    schema: {
      tags: ["handwriting"],
      body: recognizeBody,
    },
  }, async (req, reply) => {
    try {
      return await recognizeHandwriting(req.body as RecognizeHandwritingInput);
    }
    catch (err) {
      return handleUpstreamError(err, reply);
    }
  });
}

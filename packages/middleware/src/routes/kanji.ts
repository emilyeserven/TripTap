import type { FastifyInstance } from "fastify";
import { notFound } from "@/routes/handlers";
import type { KanjiListQuery, UpdateKanjiStatusInput } from "@sentence-bank/types";
import {
  KANJI_SOURCE_KINDS,
  KANJI_SORTS,
  KANJI_STATUSES,
  updateKanjiStatusJsonSchema,
} from "@sentence-bank/types";
import {
  getKanjiDetail,
  listKanji,
  setKanjiStatus,
} from "@/services/kanji";

const listQuery = {
  type: "object",
  properties: {
    status: {
      type: "string",
      enum: [...KANJI_STATUSES],
    },
    kind: {
      type: "string",
      enum: [...KANJI_SOURCE_KINDS],
    },
    minOccurrences: {
      type: "integer",
      minimum: 1,
    },
    sort: {
      type: "string",
      enum: [...KANJI_SORTS],
    },
  },
} as const;

/**
 * The `:char` path param.
 *
 * `maxLength: 2`, not 1: a supplementary-plane ideograph (Extension B and beyond, which real names
 * use) is one code point but two UTF-16 units, and Ajv measures `maxLength` in UTF-16 units. The
 * service treats anything that isn't actually in the corpus as not-found, so the loose bound costs
 * nothing. Fastify decodes path params, so handlers see the character, not its percent-encoding.
 */
const charParams = {
  type: "object",
  required: ["char"],
  properties: {
    char: {
      type: "string",
      minLength: 1,
      maxLength: 2,
    },
  },
} as const;

/**
 * The Kanji tracker, mounted under `/api/kanji`.
 *
 * Read-mostly and derived: the grid and detail are computed from the learner's corpus (see
 * `services/kanji/`), and the only write is the learner's own status for a character.
 */
export async function kanjiRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/kanji", {
    schema: {
      tags: ["kanji"],
      querystring: listQuery,
    },
  }, async req => listKanji(req.query as KanjiListQuery));

  app.get("/api/kanji/:char", {
    schema: {
      tags: ["kanji"],
      params: charParams,
    },
  }, async (req, reply) => {
    const {
      char,
    } = req.params as { char: string };
    const detail = await getKanjiDetail(char);
    if (!detail) return notFound(reply, "Kanji");
    return detail;
  });

  app.put("/api/kanji/:char/status", {
    schema: {
      tags: ["kanji"],
      params: charParams,
      body: updateKanjiStatusJsonSchema,
    },
  }, async (req, reply) => {
    const {
      char,
    } = req.params as { char: string };
    // Marking a character the corpus doesn't contain would strand a row nothing can ever surface.
    const detail = await getKanjiDetail(char);
    if (!detail) return notFound(reply, "Kanji");
    const saved = await setKanjiStatus(char, req.body as UpdateKanjiStatusInput);
    return {
      ...detail,
      status: saved.status,
      note: saved.note,
    };
  });
}

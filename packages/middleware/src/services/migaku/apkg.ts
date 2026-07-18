/**
 * Reads a legacy (uncompressed) Anki/Migaku `.apkg`: a ZIP holding a SQLite `collection.anki2`/
 * `.anki21`, a `media` JSON name-map, and numbered media files. We extract each note's fields, map
 * them to sentence/vocab candidates, and (at commit) pull the referenced audio/image bytes.
 *
 * Newer `.anki21b` collections are zstd-compressed and unsupported — callers get a friendly error.
 */

import { createRequire } from "node:module";
import { unzipSync } from "fflate";
import initSqlJs from "sql.js";
import type { FuriToken } from "@sentence-bank/types";
import { newId } from "@/lib/id";
import { MigakuParseError } from "@/services/migaku/errors";
import { detectKind, isMigakuModel } from "@/services/migaku/detect";
import { parseMigakuModelNote } from "@/services/migaku/migaku-model";
import { parseMigakuSyntax } from "@/services/migaku/syntax";
import type { StoredMigakuCandidate } from "@/services/migaku/types";

const require = createRequire(import.meta.url);
/** The SQLite WASM binary shipped with sql.js; resolved from node_modules in src and dist alike. */
const WASM_PATH = require.resolve("sql.js/dist/sql-wasm.wasm");

/** SQLite files begin with this magic; anything else in the collection slot is an unsupported format. */
const SQLITE_MAGIC = "SQLite format 3\0";

// Field names (lowercased) we recognize, in priority order.
const TEXT_FIELDS = ["expression", "sentence", "target", "japanese", "front", "word", "vocabulary", "term", "kanji", "reading question"];
const MEANING_FIELDS = ["meaning", "definition", "translation", "english", "back", "glossary", "notes"];

const MIME_BY_EXT: Record<string, string> = {
  mp3: "audio/mpeg",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  aac: "audio/aac",
  flac: "audio/flac",
  opus: "audio/opus",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
};

/** Best-effort MIME type from a filename extension. */
export function mimeForFilename(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

const SOUND_RE = /\[sound:([^\]]+)\]/;
const IMG_RE = /<img[^>]+src=["']?([^"'>\s]+)["']?[^>]*>/i;

interface AnkiModelField { name: string;
  ord: number; }
interface AnkiModel { name: string;
  flds: AnkiModelField[]; }

/** Decompress just the collection DB and the media name-map from the package. */
function readZip(buffer: Buffer): { collection: Uint8Array;
  mediaMap: Record<string, string>; } {
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(new Uint8Array(buffer), {
      filter: f => f.name === "collection.anki2" || f.name === "collection.anki21"
        || f.name === "collection.anki21b" || f.name === "media",
    });
  }
  catch (err) {
    throw new MigakuParseError(`Not a readable .apkg archive: ${String(err)}`);
  }

  const collection = entries["collection.anki21"] ?? entries["collection.anki2"];
  if (!collection) {
    if (entries["collection.anki21b"]) {
      throw new MigakuParseError(
        "This .apkg uses Anki's newer compressed format, which isn't supported. Re-export it from "
        + "Migaku/Anki using the legacy export option (uncompressed).",
      );
    }
    throw new MigakuParseError("No Anki collection found in the .apkg.");
  }

  const header = Buffer.from(collection.slice(0, SQLITE_MAGIC.length)).toString("binary");
  if (header !== SQLITE_MAGIC) {
    throw new MigakuParseError(
      "The Anki collection isn't an uncompressed SQLite database (likely a newer/compressed export). "
      + "Re-export using the legacy option.",
    );
  }

  let mediaMap: Record<string, string> = {};
  if (entries.media) {
    try {
      mediaMap = JSON.parse(Buffer.from(entries.media).toString("utf8")) as Record<string, string>;
    }
    catch {
      mediaMap = {};
    }
  }
  return {
    collection,
    mediaMap,
  };
}

/** Split an Anki `flds` blob into values indexed by the model's field order. */
function fieldMap(flds: string, model: AnkiModel): Map<string, string> {
  const values = flds.split("\x1f");
  const byOrd = new Map<string, string>();
  for (const fld of model.flds) {
    byOrd.set(fld.name.toLowerCase(), values[fld.ord] ?? "");
  }
  return byOrd;
}

/** Pick the first non-empty field whose name matches one of `names` (in priority order). */
function pick(fields: Map<string, string>, names: string[]): string | null {
  for (const name of names) {
    const value = fields.get(name);
    if (value && value.trim()) return value;
  }
  return null;
}

/** Find the first media filename referenced across all of a note's fields. */
function findMedia(fields: Map<string, string>, re: RegExp): string | null {
  for (const value of fields.values()) {
    const match = re.exec(value);
    if (match) return match[1];
  }
  return null;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();
}

/**
 * Parse a `.apkg` into staged candidates. Each Anki note becomes one candidate; media references are
 * recorded by filename (bytes are pulled later from the stored package by {@link extractApkgMedia}).
 */
/**
 * Best-effort Anki deck name from the collection: the most-populated non-"Default" deck. Legacy
 * `.apkg`s keep decks as a JSON map in `col.decks`; returns null when unavailable.
 */
function extractDeckName(db: InstanceType<Awaited<ReturnType<typeof initSqlJs>>["Database"]>): string | null {
  try {
    const decksRes = db.exec("SELECT decks FROM col LIMIT 1");
    if (!decksRes.length || !decksRes[0].values.length) return null;
    const decks = JSON.parse(String(decksRes[0].values[0][0])) as Record<string, { name?: string }>;

    let didByCount: string[] = [];
    try {
      const cardsRes = db.exec("SELECT did, COUNT(*) AS n FROM cards GROUP BY did ORDER BY n DESC");
      if (cardsRes.length) didByCount = cardsRes[0].values.map(v => String(v[0]));
    }
    catch {
      // `cards` table missing or unreadable — fall back to the raw decks map below.
    }

    const isReal = (name: string | undefined): name is string =>
      !!name && name.trim().length > 0 && name.trim().toLowerCase() !== "default";

    for (const did of didByCount) {
      const name = decks[did]?.name;
      if (isReal(name)) return name.trim();
    }
    for (const deck of Object.values(decks)) {
      if (isReal(deck?.name)) return deck.name.trim();
    }
    return null;
  }
  catch {
    return null;
  }
}

export interface ParsedApkg {
  /** Parsed Anki deck name, or null when the package didn't yield one. */
  deckName: string | null;
  candidates: StoredMigakuCandidate[];
}

export async function parseApkg(buffer: Buffer): Promise<ParsedApkg> {
  const {
    collection,
  } = readZip(buffer);

  const SQL = await initSqlJs({
    locateFile: () => WASM_PATH,
  });
  const db = new SQL.Database(collection);
  try {
    const deckName = extractDeckName(db);
    const colRes = db.exec("SELECT models FROM col LIMIT 1");
    if (!colRes.length || !colRes[0].values.length) {
      throw new MigakuParseError("The Anki collection has no note types.");
    }
    const models = JSON.parse(String(colRes[0].values[0][0])) as Record<string, AnkiModel>;

    const notesRes = db.exec("SELECT mid, flds, tags FROM notes");
    if (!notesRes.length) return {
      deckName,
      candidates: [],
    };

    const candidates: StoredMigakuCandidate[] = [];
    for (const row of notesRes[0].values) {
      const [mid, flds, tags] = row as [number, string, string];
      const model = models[String(mid)];
      if (!model) continue;

      const fields = fieldMap(flds, model);
      const noteTags = (tags ?? "").trim().split(/\s+/).filter(Boolean);
      const tagStr = [...new Set(["migaku", ...noteTags])].join(", ");

      // Migaku's "Sentence" note type bundles a focus word + its example sentence → the paired path.
      if (isMigakuModel(model.flds.map(f => f.name))) {
        const parsed = parseMigakuModelNote(fields, tagStr);
        if (parsed) candidates.push(...parsed.candidates);
        continue;
      }

      // Generic path: one flat sentence-or-vocab row per note, guessing the text/meaning fields.
      const rawText = pick(fields, TEXT_FIELDS) ?? [...fields.values()].find(v => v.trim()) ?? "";
      const {
        text, reading,
      } = parseMigakuSyntax(rawText);
      if (!text.trim()) continue;

      const rawMeaning = pick(fields, MEANING_FIELDS);
      const meaning = rawMeaning ? stripTags(rawMeaning) || null : null;

      const audioFile = findMedia(fields, SOUND_RE);
      const imageFile = findMedia(fields, IMG_RE);

      candidates.push({
        id: newId(),
        kind: detectKind(text, model.name ?? null),
        text,
        reading: reading as FuriToken[],
        meaning,
        notes: null,
        tags: tagStr,
        hasAudio: audioFile !== null,
        hasImage: imageFile !== null,
        audioFile,
        imageFile,
      });
    }
    return {
      deckName,
      candidates,
    };
  }
  finally {
    db.close();
  }
}

/** Extract one media file's bytes + MIME from a stored package, or null when absent. */
export function extractApkgMedia(
  buffer: Buffer,
  filename: string,
): { body: Buffer;
  mime: string; } | null {
  const {
    mediaMap,
  } = readZip(buffer);
  // The media JSON maps numeric zip-entry name → original filename; reverse it.
  const entryName = Object.keys(mediaMap).find(key => mediaMap[key] === filename);
  if (entryName === undefined) return null;
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(new Uint8Array(buffer), {
      filter: f => f.name === entryName,
    });
  }
  catch {
    return null;
  }
  const bytes = entries[entryName];
  if (!bytes) return null;
  return {
    body: Buffer.from(bytes),
    mime: mimeForFilename(filename),
  };
}

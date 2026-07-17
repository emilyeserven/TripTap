import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { before, describe, it } from "node:test";
import { zipSync } from "fflate";
import initSqlJs from "sql.js";
import { extractApkgMedia, parseApkg } from "@/services/migaku/apkg";

const require = createRequire(import.meta.url);
const WASM_PATH = require.resolve("sql.js/dist/sql-wasm.wasm");

/** Build a minimal legacy `.apkg`: a SQLite collection + a one-file media map, zipped. */
async function buildApkg(): Promise<Buffer> {
  const SQL = await initSqlJs({
    locateFile: () => WASM_PATH,
  });
  const db = new SQL.Database();

  const models = {
    1: {
      name: "Migaku Japanese",
      flds: [
        {
          name: "Expression",
          ord: 0,
        },
        {
          name: "Meaning",
          ord: 1,
        },
        {
          name: "Audio",
          ord: 2,
        },
      ],
    },
  };
  const decks = {
    1: {
      name: "Default",
    },
    1678886400000: {
      name: "Japanese N5",
    },
  };
  db.run("CREATE TABLE col (models text, decks text);");
  db.run("INSERT INTO col (models, decks) VALUES (?, ?);", [
    JSON.stringify(models),
    JSON.stringify(decks),
  ]);
  db.run("CREATE TABLE notes (mid integer, flds text, tags text);");
  // Two notes: a sentence card (with audio) and a single-word vocab card.
  db.run("INSERT INTO notes (mid, flds, tags) VALUES (?, ?, ?);", [
    1,
    "日本[にほん]が 好[す]きです。\x1fI like Japan.\x1f[sound:like.mp3]",
    "n5",
  ]);
  db.run("INSERT INTO notes (mid, flds, tags) VALUES (?, ?, ?);", [
    1,
    "猫[ねこ]\x1fcat\x1f",
    "",
  ]);
  // Both cards live in the non-Default deck, so that's the dominant deck name.
  db.run("CREATE TABLE cards (did integer);");
  db.run("INSERT INTO cards (did) VALUES (1678886400000);");
  db.run("INSERT INTO cards (did) VALUES (1678886400000);");
  const collection = db.export();
  db.close();

  return Buffer.from(zipSync({
    "collection.anki2": collection,
    "media": new TextEncoder().encode(JSON.stringify({
      0: "like.mp3",
    })),
    "0": new TextEncoder().encode("FAKE-MP3-BYTES"),
  }));
}

describe("parseApkg", () => {
  let apkg: Buffer;
  before(async () => {
    apkg = await buildApkg();
  });

  it("extracts the dominant non-Default deck name", async () => {
    const {
      deckName,
    } = await parseApkg(apkg);
    assert.equal(deckName, "Japanese N5");
  });

  it("extracts candidates with parsed furigana and detected kinds", async () => {
    const {
      candidates,
    } = await parseApkg(apkg);
    assert.equal(candidates.length, 2);

    const sentence = candidates.find(c => c.text.includes("好き"));
    assert.ok(sentence);
    assert.equal(sentence.kind, "sentence");
    assert.equal(sentence.text, "日本が好きです。");
    assert.deepEqual(sentence.reading[0], {
      t: "日本",
      r: "にほん",
    });
    assert.equal(sentence.meaning, "I like Japan.");
    assert.equal(sentence.hasAudio, true);
    assert.equal(sentence.audioFile, "like.mp3");
    assert.ok(sentence.tags?.includes("migaku"));
    assert.ok(sentence.tags?.includes("n5"));

    const vocab = candidates.find(c => c.text === "猫");
    assert.ok(vocab);
    assert.equal(vocab.kind, "vocab");
    assert.equal(vocab.hasAudio, false);
  });

  it("resolves media bytes by original filename", async () => {
    const media = extractApkgMedia(apkg, "like.mp3");
    assert.ok(media);
    assert.equal(media.mime, "audio/mpeg");
    assert.equal(media.body.toString("utf8"), "FAKE-MP3-BYTES");
  });

  it("returns null for an unknown media filename", async () => {
    assert.equal(extractApkgMedia(apkg, "missing.mp3"), null);
  });
});

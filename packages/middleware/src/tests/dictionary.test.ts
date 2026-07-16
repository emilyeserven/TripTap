import assert from "node:assert/strict";
import { test } from "node:test";
import { buildApp } from "@/app";
import { parseJisho, parseJotoba } from "@/services/dictionary";

// The route tests exercise Fastify's schema validation and the domain-error → HTTP mapping, neither of
// which needs a database or a live dictionary host. The parser tests run the pure normalizers against
// captured provider payloads, so they never touch the network.

test("GET /api/dictionary/search requires a keyword", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "GET",
    url: "/api/dictionary/search",
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("GET /api/dictionary/search rejects an empty keyword", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "GET",
    url: "/api/dictionary/search?keyword=",
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("GET /api/dictionary/search returns 502 when the configured host is unreachable", async () => {
  // Point the resolver at a closed port so fetch fails fast → DictionaryUnavailableError → 502.
  const prev = process.env.DICTIONARY_API_URL;
  process.env.DICTIONARY_API_URL = "http://127.0.0.1:1";
  try {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/dictionary/search?keyword=%E9%A3%9F%E3%81%B9%E3%82%8B",
    });
    assert.equal(res.statusCode, 502);
    await app.close();
  }
  finally {
    if (prev === undefined) delete process.env.DICTIONARY_API_URL;
    else process.env.DICTIONARY_API_URL = prev;
  }
});

test("parseJisho normalizes a Jisho response into dictionary entries", () => {
  const raw = {
    data: [
      {
        slug: "食べる",
        is_common: true,
        jlpt: ["jlpt-n5"],
        japanese: [{
          word: "食べる",
          reading: "たべる",
        }],
        senses: [
          {
            english_definitions: ["to eat", "to live on (e.g. a salary)"],
            parts_of_speech: ["Ichidan verb", "Transitive verb"],
          },
          {
            english_definitions: ["to subsist"],
            parts_of_speech: [],
          },
        ],
      },
    ],
  };
  const entries = parseJisho(raw);
  assert.equal(entries.length, 1);
  assert.deepEqual(entries[0], {
    word: "食べる",
    reading: "たべる",
    meanings: ["to eat", "to live on (e.g. a salary)", "to subsist"],
    partsOfSpeech: ["Ichidan verb", "Transitive verb"],
    jlpt: "N5",
    common: true,
  });
});

test("parseJisho falls back to the reading for kana-only entries and drops malformed items", () => {
  const raw = {
    data: [
      null,
      {}, // no japanese/senses → no word or reading → dropped
      {
        is_common: false,
        japanese: [{
          reading: "ありがとう",
        }],
        senses: [{
          english_definitions: ["thank you"],
        }],
      },
    ],
  };
  const entries = parseJisho(raw);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].word, "ありがとう");
  assert.equal(entries[0].reading, "ありがとう");
  assert.deepEqual(entries[0].meanings, ["thank you"]);
  assert.equal(entries[0].jlpt, null);
  assert.equal(entries[0].common, false);
});

test("parseJisho returns an empty array for a non-object or missing data", () => {
  assert.deepEqual(parseJisho(null), []);
  assert.deepEqual(parseJisho({}), []);
  assert.deepEqual(parseJisho({
    data: "nope",
  }), []);
});

test("parseJotoba normalizes a Jotoba response into dictionary entries", () => {
  const raw = {
    words: [
      {
        reading: {
          kana: "たべる",
          kanji: "食べる",
        },
        common: true,
        jlpt: 5,
        senses: [
          {
            glosses: ["to eat"],
            pos: [{
              Verb: "Ichidan",
            }, "Transitive"],
          },
        ],
      },
    ],
  };
  const entries = parseJotoba(raw);
  assert.equal(entries.length, 1);
  assert.deepEqual(entries[0], {
    word: "食べる",
    reading: "たべる",
    meanings: ["to eat"],
    partsOfSpeech: ["Verb", "Transitive"],
    jlpt: "N5",
    common: true,
  });
});

test("parseJotoba uses the kana form when there is no kanji", () => {
  const raw = {
    words: [
      {
        reading: {
          kana: "ありがとう",
        },
        senses: [{
          glosses: ["thank you"],
        }],
      },
    ],
  };
  const entries = parseJotoba(raw);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].word, "ありがとう");
  assert.equal(entries[0].reading, "ありがとう");
  assert.equal(entries[0].jlpt, null);
  assert.equal(entries[0].common, false);
});

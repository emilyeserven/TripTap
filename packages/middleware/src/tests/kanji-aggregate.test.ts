import assert from "node:assert/strict";
import { test } from "node:test";
import { indexKanji, type KanjiSourceItem } from "@/services/kanji/extract";

// `indexKanji` is the pure core of the kanji feature — the counting rules are the part worth
// testing, and they need no database.

function item(overrides: Partial<KanjiSourceItem> & { id: string;
  text: string; }): KanjiSourceItem {
  return {
    kind: "sentence",
    reading: null,
    gloss: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

test("empty input yields an empty index", () => {
  assert.equal(indexKanji([]).size, 0);
});

test("occurrences count repeats but itemCount counts items", () => {
  const index = indexKanji([
    item({
      id: "a",
      text: "日曜日",
    }),
    item({
      id: "b",
      text: "日記",
    }),
  ]);

  const hi = index.get("日");
  assert.ok(hi);
  // 日 appears twice in "日曜日" and once in "日記".
  assert.equal(hi.occurrences, 3);
  assert.equal(hi.itemCount, 2);
});

test("a character repeated inside one item still counts that item once", () => {
  const index = indexKanji([item({
    id: "a",
    text: "人人人",
  })]);
  const person = index.get("人");
  assert.ok(person);
  assert.equal(person.occurrences, 3);
  assert.equal(person.itemCount, 1);
});

test("firstSeenAt and lastSeenAt are the min and max createdAt of the containing items", () => {
  const index = indexKanji([
    item({
      id: "b",
      text: "本",
      createdAt: "2026-03-01T00:00:00.000Z",
    }),
    item({
      id: "a",
      text: "本",
      createdAt: "2026-01-01T00:00:00.000Z",
    }),
    item({
      id: "c",
      text: "本",
      createdAt: "2026-02-01T00:00:00.000Z",
    }),
  ]);

  const book = index.get("本");
  assert.ok(book);
  assert.equal(book.firstSeenAt, "2026-01-01T00:00:00.000Z");
  assert.equal(book.lastSeenAt, "2026-03-01T00:00:00.000Z");
});

test("kindCounts tallies per source and zero-fills every kind", () => {
  const index = indexKanji([
    item({
      id: "a",
      text: "本",
      kind: "sentence",
    }),
    item({
      id: "b",
      text: "本",
      kind: "vocab",
    }),
    item({
      id: "c",
      text: "本",
      kind: "vocab",
    }),
  ]);

  const book = index.get("本");
  assert.ok(book);
  assert.equal(book.kindCounts.sentence, 1);
  assert.equal(book.kindCounts.vocab, 2);
  // Every kind is present so the client never has to guard on a missing key.
  assert.equal(book.kindCounts.writing, 0);
  assert.equal(book.kindCounts.dialogue, 0);
});

test("items come back newest first, each carrying its own occurrence count", () => {
  const index = indexKanji([
    item({
      id: "old",
      text: "日",
      createdAt: "2026-01-01T00:00:00.000Z",
    }),
    item({
      id: "new",
      text: "日曜日",
      createdAt: "2026-05-01T00:00:00.000Z",
    }),
  ]);

  const hi = index.get("日");
  assert.ok(hi);
  assert.deepEqual(hi.items.map(i => i.id), ["new", "old"]);
  assert.equal(hi.items[0].count, 2);
  assert.equal(hi.items[1].count, 1);
});

test("kana-only text contributes nothing to the index", () => {
  const index = indexKanji([item({
    id: "a",
    text: "ひらがなだけです",
  })]);
  assert.equal(index.size, 0);
});

test("gloss and reading are carried through to the occurrence", () => {
  const reading = [{
    t: "本",
    r: "ほん",
  }];
  const index = indexKanji([item({
    id: "a",
    text: "本",
    gloss: "book",
    reading,
  })]);

  const book = index.get("本");
  assert.ok(book);
  assert.equal(book.items[0].gloss, "book");
  assert.deepEqual(book.items[0].reading, reading);
});

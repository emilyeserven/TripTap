import assert from "node:assert/strict";
import { test } from "node:test";
import type { SourceLike } from "@sentence-bank/types";
import {
  flattenSourceTree,
  sourceAncestors,
  sourceChildren,
  sourceDescendants,
  sourcePathLabel,
  sourceSubtreeIds,
  wouldCreateSourceCycle,
} from "@sentence-bank/types";
import { buildApp } from "@/app";

// The hierarchy helpers are pure functions shared by the API and the client, so they need no
// database; the endpoint tests use Fastify's `inject` + JSON-schema validation, which likewise runs
// without one.

function source(id: string, name: string, parentId: string | null = null): SourceLike {
  return {
    id,
    name,
    parentId,
  };
}

/** A magazine → issue → two pages, plus an unrelated top-level book. */
const TREE: SourceLike[] = [
  source("page-12", "p. 12", "issue-6"),
  source("book", "よつばと！ vol. 1"),
  source("mag", "NHK News Web Easy"),
  source("page-3", "p. 3", "issue-6"),
  source("issue-6", "2024-06", "mag"),
];

test("sourceAncestors returns the chain outermost first", () => {
  assert.deepEqual(sourceAncestors(TREE, "page-12").map(s => s.id), ["mag", "issue-6"]);
  assert.deepEqual(sourceAncestors(TREE, "mag"), []);
  assert.deepEqual(sourceAncestors(TREE, "nope"), []);
});

test("sourcePathLabel joins the tiers, with or without the source itself", () => {
  assert.equal(sourcePathLabel(TREE, "page-12"), "NHK News Web Easy › 2024-06 › p. 12");
  assert.equal(sourcePathLabel(TREE, "page-12", {
    includeSelf: false,
  }), "NHK News Web Easy › 2024-06");
  assert.equal(sourcePathLabel(TREE, "book"), "よつばと！ vol. 1");
  assert.equal(sourcePathLabel(TREE, "nope"), "");
});

test("sourceChildren lists one tier alphabetically, and roots for null", () => {
  assert.deepEqual(sourceChildren(TREE, "issue-6").map(s => s.name), ["p. 12", "p. 3"]);
  assert.deepEqual(sourceChildren(TREE, null).map(s => s.id), ["mag", "book"]);
  assert.deepEqual(sourceChildren(TREE, "page-12"), []);
});

test("a source whose parent no longer exists reads as a root", () => {
  const orphaned = [source("orphan", "p. 12", "deleted-issue"), source("book", "Book")];
  assert.deepEqual(sourceChildren(orphaned, null).map(s => s.id), ["book", "orphan"]);
  assert.deepEqual(sourceAncestors(orphaned, "orphan"), []);
  assert.equal(sourcePathLabel(orphaned, "orphan"), "p. 12");
});

test("sourceDescendants walks every tier below a source", () => {
  assert.deepEqual(
    sourceDescendants(TREE, "mag").map(s => s.id).sort(),
    ["issue-6", "page-12", "page-3"],
  );
  assert.deepEqual(sourceDescendants(TREE, "page-3"), []);
  assert.deepEqual([...sourceSubtreeIds(TREE, "issue-6")].sort(), ["issue-6", "page-12", "page-3"]);
});

test("flattenSourceTree puts each parent immediately above its children", () => {
  assert.deepEqual(flattenSourceTree(TREE).map(e => [e.source.id, e.depth]), [
    ["mag", 0],
    ["issue-6", 1],
    ["page-12", 2],
    ["page-3", 2],
    ["book", 0],
  ]);
});

test("hierarchy walks terminate on data that already holds a cycle", () => {
  const looped = [source("a", "A", "b"), source("b", "B", "a")];
  assert.deepEqual(sourceAncestors(looped, "a").map(s => s.id), ["b"]);
  assert.deepEqual(sourceDescendants(looped, "a").map(s => s.id), ["b"]);
  // Neither is reachable from a root, so both still show up exactly once.
  assert.deepEqual(flattenSourceTree(looped).map(e => e.source.id), ["a", "b"]);
});

test("wouldCreateSourceCycle catches self-parenting and descendant-parenting", () => {
  assert.equal(wouldCreateSourceCycle(TREE, "mag", "mag"), true);
  assert.equal(wouldCreateSourceCycle(TREE, "mag", "page-12"), true);
  assert.equal(wouldCreateSourceCycle(TREE, "mag", "issue-6"), true);
  assert.equal(wouldCreateSourceCycle(TREE, "page-12", "book"), false);
  assert.equal(wouldCreateSourceCycle(TREE, "page-12", null), false);
});

test("POST /api/sources accepts a parentId", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/sources",
    payload: {
      name: "p. 12",
      parentId: "11111111-1111-1111-1111-111111111111",
      url: "https://app.renshuu.org/text/70231/0",
    },
  });
  // No database here, so the insert can't succeed — this asserts the payload passes validation.
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

test("POST /api/sources rejects a non-uuid parentId", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/sources",
    payload: {
      name: "p. 12",
      parentId: "the-magazine",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("PATCH /api/sources/:id rejects a non-uuid parentId", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "PATCH",
    url: "/api/sources/11111111-1111-1111-1111-111111111111",
    payload: {
      parentId: "the-magazine",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("PATCH /api/sources/:id accepts clearing the parent", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "PATCH",
    url: "/api/sources/11111111-1111-1111-1111-111111111111",
    payload: {
      parentId: null,
    },
  });
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

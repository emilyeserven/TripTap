import assert from "node:assert/strict";
import { test } from "node:test";
import { buildApp } from "@/app";
import { toBookmarkResource } from "@/services/bookmarks";

// Schema-validation tests for the bookmarks settings + proxy routes. Fastify validates params/body
// before the handler runs, so the malformed-input cases need no database or live bookmarks host.

test("PATCH /api/settings/bookmarks accepts an endpoint URL and a source", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "PATCH",
    url: "/api/settings/bookmarks",
    payload: {
      endpointUrl: "https://example.ts.net",
      source: {
        kind: "taxonomy",
        id: "abc",
        label: "Genres",
      },
    },
  });
  // 200 when the DB is available, or a 5xx if it isn't — but never a 400 (the payload is valid).
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

test("PATCH /api/settings/bookmarks rejects a source with an unknown kind", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "PATCH",
    url: "/api/settings/bookmarks",
    payload: {
      source: {
        kind: "folder",
        id: "abc",
        label: "Nope",
      },
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("PATCH /api/settings/bookmarks rejects a source missing required fields", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "PATCH",
    url: "/api/settings/bookmarks",
    payload: {
      source: {
        kind: "tag",
      },
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("PATCH /api/settings/bookmarks accepts grammar/general sources and a drilled-down parent term", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "PATCH",
    url: "/api/settings/bookmarks",
    payload: {
      source: {
        kind: "taxonomy",
        id: "abc",
        label: "Genres",
        termId: "t1",
        termLabel: "Fiction",
      },
      grammarSource: {
        kind: "taxonomy",
        id: "g1",
        label: "Grammar",
      },
      generalSource: {
        kind: "tag",
        id: "gen1",
        label: "Context",
      },
    },
  });
  // 200 when the DB is available, or a 5xx if it isn't — but never a 400 (the payload is valid).
  assert.notEqual(res.statusCode, 400);
  await app.close();
});

test("PATCH /api/settings/bookmarks rejects a grammar source with an unknown kind", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "PATCH",
    url: "/api/settings/bookmarks",
    payload: {
      grammarSource: {
        kind: "folder",
        id: "g1",
        label: "Nope",
      },
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/bookmarks/terms rejects a body missing the term name", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "POST",
    url: "/api/bookmarks/terms",
    payload: {
      category: "grammar",
    },
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("POST /api/bookmarks/terms returns 503 when the channel has no source configured", async () => {
  const app = await buildApp();
  // Clear the grammar source first so the create has no target, regardless of DB state (with no DB
  // this PATCH is a no-op and the source is already unresolved). Either way → 503, never a host call.
  await app.inject({
    method: "PATCH",
    url: "/api/settings/bookmarks",
    payload: {
      grammarSource: null,
    },
  });
  const res = await app.inject({
    method: "POST",
    url: "/api/bookmarks/terms",
    payload: {
      name: "です／ます",
      category: "grammar",
    },
  });
  assert.equal(res.statusCode, 503);
  await app.close();
});

test("GET /api/bookmarks/records requires a category", async () => {
  const app = await buildApp();
  const res = await app.inject({
    method: "GET",
    url: "/api/bookmarks/records",
  });
  assert.equal(res.statusCode, 400);
  await app.close();
});

test("GET /api/bookmarks/tags returns 502 when the configured host is unreachable", async () => {
  // Point the resolver at a closed port so fetch fails fast → BookmarksUnavailableError → 502.
  const prev = process.env.BOOKMARKS_API_URL;
  process.env.BOOKMARKS_API_URL = "http://127.0.0.1:1";
  try {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/bookmarks/tags",
    });
    assert.equal(res.statusCode, 502);
    await app.close();
  }
  finally {
    if (prev === undefined) delete process.env.BOOKMARKS_API_URL;
    else process.env.BOOKMARKS_API_URL = prev;
  }
});

const RUNTIME_PROP = "9c231589-0bf9-45cc-8b38-f76bdafe6a7b";

test("toBookmarkResource extracts website, runtime, and media type", () => {
  const raw = {
    id: "b1",
    title: "A video",
    url: "https://www.youtube.com/watch?v=x",
    website: {
      domain: "youtube.com",
      siteName: "YouTube",
      extra: "ignored",
    },
    mediaType: {
      name: "Video",
    },
    image: {
      id: "img1",
      url: "/api/bookmarks/b1/images/img1?v=1",
      isMain: true,
    },
    numberValues: [{
      propertyId: RUNTIME_PROP,
      value: 1652,
    }],
  };
  assert.deepEqual(toBookmarkResource(raw, RUNTIME_PROP), {
    id: "b1",
    title: "A video",
    url: "https://www.youtube.com/watch?v=x",
    website: {
      domain: "youtube.com",
      siteName: "YouTube",
    },
    runtimeSeconds: 1652,
    mediaType: "Video",
    imageUrl: "/api/bookmarks/b1/images/img1?v=1",
  });
});

test("toBookmarkResource degrades missing website/runtime/mediaType to null", () => {
  const res = toBookmarkResource({
    id: "b2",
    title: "No metadata",
  }, RUNTIME_PROP);
  assert.deepEqual(res, {
    id: "b2",
    title: "No metadata",
    url: null,
    website: null,
    runtimeSeconds: null,
    mediaType: null,
    imageUrl: null,
  });
});

test("toBookmarkResource ignores number values from other properties", () => {
  const raw = {
    id: "b3",
    title: "Other props",
    numberValues: [{
      propertyId: "some-other-prop",
      value: 42,
    }],
  };
  assert.equal(toBookmarkResource(raw, RUNTIME_PROP)?.runtimeSeconds, null);
});

test("toBookmarkResource rejects a record without id/title", () => {
  assert.equal(toBookmarkResource({
    title: "no id",
  }, RUNTIME_PROP), null);
  assert.equal(toBookmarkResource(null, RUNTIME_PROP), null);
});

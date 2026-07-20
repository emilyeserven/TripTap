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

test("GET /api/bookmarks/by-tag/:tagId returns 502 when the configured host is unreachable", async () => {
  const prev = process.env.BOOKMARKS_API_URL;
  process.env.BOOKMARKS_API_URL = "http://127.0.0.1:1";
  try {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/bookmarks/by-tag/tag-123",
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
const COMPLEXITY_PROP = "fa612b61-a90b-453a-9fee-a124d7c5b78b";
const PROPS = {
  runtimePropId: RUNTIME_PROP,
  complexityPropId: COMPLEXITY_PROP,
};

test("toBookmarkResource extracts website, runtime, media type, and complexity", () => {
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
    numberValues: [
      {
        propertyId: RUNTIME_PROP,
        value: 1652,
      },
      {
        propertyId: COMPLEXITY_PROP,
        value: 2,
        valueEnd: null,
      },
    ],
  };
  assert.deepEqual(toBookmarkResource(raw, PROPS), {
    id: "b1",
    title: "A video",
    url: "https://www.youtube.com/watch?v=x",
    website: {
      domain: "youtube.com",
      siteName: "YouTube",
    },
    runtimeSeconds: 1652,
    mediaType: "Video",
    complexity: {
      min: 2,
      max: 2,
    },
    progress: null,
    favorite: false,
    contentStatus: null,
    tagIds: [],
    imageUrl: "/api/bookmarks/b1/images/img1?v=1",
  });
});

test("toBookmarkResource composes the progress label like the bookmarks app", () => {
  const PROGRESS_PROP = "ab97c792-d1db-4303-a0a2-75e6d2ceef11";
  const raw = {
    id: "bp",
    title: "Reader",
    progressValues: [{
      propertyId: PROGRESS_PROP,
      current: 12,
      total: 200,
      textOverride: null,
      autoSpace: null,
    }],
  };
  const props = {
    runtimePropId: null,
    complexityPropId: null,
    progress: {
      id: PROGRESS_PROP,
      before: "",
      between: " of ",
      after: " pages",
    },
  };
  assert.deepEqual(toBookmarkResource(raw, props)?.progress, {
    current: 12,
    total: 200,
    percent: 12 / 200,
    label: "12 of 200 pages",
  });
  // No progress for a bookmark that carries only another itemInItems property's value.
  assert.equal(
    toBookmarkResource({
      id: "bp2",
      title: "Other",
      progressValues: [{
        propertyId: "some-other-prop",
        current: 1,
        total: 2,
      }],
    }, props)?.progress,
    null,
  );
});

test("toBookmarkResource extracts tag ids, ignoring malformed tag entries", () => {
  const raw = {
    id: "bt",
    title: "Tagged",
    tags: [
      {
        id: "t1",
        name: "Listening",
      },
      {
        name: "no id",
      },
      null,
      {
        id: 42,
      },
      {
        id: "t2",
      },
    ],
  };
  assert.deepEqual(toBookmarkResource(raw, PROPS)?.tagIds, ["t1", "t2"]);
});

test("toBookmarkResource falls back to the screenshot when the bookmark has no image", () => {
  const raw = {
    id: "s1",
    title: "Screenshot only",
    image: null,
    images: [],
    screenshot: {
      id: "scr1",
      url: "/api/bookmarks/s1/screenshot?v=9",
    },
    imageDisplayPreference: "auto",
  };
  assert.equal(toBookmarkResource(raw, PROPS)?.imageUrl, "/api/bookmarks/s1/screenshot?v=9");
});

test("toBookmarkResource prefers the image over the screenshot by default", () => {
  const raw = {
    id: "b2",
    title: "Both",
    image: {
      url: "/api/bookmarks/b2/images/i2?v=1",
    },
    screenshot: {
      url: "/api/bookmarks/b2/screenshot?v=2",
    },
    imageDisplayPreference: "auto",
  };
  assert.equal(toBookmarkResource(raw, PROPS)?.imageUrl, "/api/bookmarks/b2/images/i2?v=1");
});

test("toBookmarkResource honors imageDisplayPreference 'screenshot'", () => {
  const raw = {
    id: "b3",
    title: "Prefers screenshot",
    image: {
      url: "/api/bookmarks/b3/images/i3?v=1",
    },
    screenshot: {
      url: "/api/bookmarks/b3/screenshot?v=2",
    },
    imageDisplayPreference: "screenshot",
  };
  assert.equal(toBookmarkResource(raw, PROPS)?.imageUrl, "/api/bookmarks/b3/screenshot?v=2");
  // …but still falls back to the image when there's no screenshot.
  assert.equal(
    toBookmarkResource({
      id: "b3b",
      title: "No screenshot",
      image: {
        url: "/api/bookmarks/b3b/images/i/?v=1",
      },
      imageDisplayPreference: "screenshot",
    }, PROPS)?.imageUrl,
    "/api/bookmarks/b3b/images/i/?v=1",
  );
});

test("toBookmarkResource normalizes a complexity range into a band", () => {
  const raw = {
    id: "br",
    title: "Ranged",
    numberValues: [{
      propertyId: COMPLEXITY_PROP,
      value: 4,
      valueEnd: 1,
    }],
  };
  assert.deepEqual(toBookmarkResource(raw, PROPS)?.complexity, {
    min: 1,
    max: 4,
  });
});

test("toBookmarkResource prefers the primary name over the stale title (reflects renames)", () => {
  const raw = {
    id: "b1",
    title: "Manning Publications", // stale auto-grabbed value
    names: [
      {
        value: "Learn SQL in a Month of Lunches",
        isPrimary: true,
      },
      {
        value: "secondary",
        isPrimary: false,
      },
    ],
  };
  assert.equal(toBookmarkResource(raw, PROPS)?.title, "Learn SQL in a Month of Lunches");
});

test("toBookmarkResource falls back to the first name, then to title, when no primary name", () => {
  assert.equal(
    toBookmarkResource({
      id: "b1",
      title: "Stale",
      names: [{
        value: "Only name",
      }],
    }, PROPS)?.title,
    "Only name",
  );
  assert.equal(
    toBookmarkResource({
      id: "b2",
      title: "Only title",
      names: [],
    }, PROPS)?.title,
    "Only title",
  );
});

test("toBookmarkResource degrades missing website/runtime/mediaType/complexity to null", () => {
  const res = toBookmarkResource({
    id: "b2",
    title: "No metadata",
  }, PROPS);
  assert.deepEqual(res, {
    id: "b2",
    title: "No metadata",
    url: null,
    website: null,
    runtimeSeconds: null,
    mediaType: null,
    complexity: null,
    progress: null,
    favorite: false,
    contentStatus: null,
    tagIds: [],
    imageUrl: null,
  });
});

test("toBookmarkResource reads the favorite boolean property", () => {
  const FAV = "f95c5eac-f7ef-4005-8cb8-704d343ac579";
  const props = {
    runtimePropId: null,
    complexityPropId: null,
    favoritePropId: FAV,
  };
  assert.equal(
    toBookmarkResource({
      id: "f1",
      title: "Fav",
      booleanValues: [{
        propertyId: FAV,
        value: true,
      }],
    }, props)?.favorite,
    true,
  );
  assert.equal(
    toBookmarkResource({
      id: "f2",
      title: "Not fav",
      booleanValues: [{
        propertyId: FAV,
        value: false,
      }],
    }, props)?.favorite,
    false,
  );
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
  const res = toBookmarkResource(raw, PROPS);
  assert.equal(res?.runtimeSeconds, null);
  assert.equal(res?.complexity, null);
});

test("toBookmarkResource rejects a record without id/title", () => {
  assert.equal(toBookmarkResource({
    title: "no id",
  }, PROPS), null);
  assert.equal(toBookmarkResource(null, PROPS), null);
});

# eeSimple Bookmarks — upstream API contract

The exact HTTP surface of the external bookmarks host that TripTap's middleware consumes. This is the
**source of truth** — the host is Tailnet-only and unauthenticated, so you cannot inspect it live. Every
shape below is what `services/bookmarks/` actually depends on; the host returns more fields, but only
these are consumed, and the mappers ignore the rest.

## Conventions

- **Base URL** — resolved per request (`config.ts`): DB Settings → `BOOKMARKS_API_URL` → default
  `https://eserve-raspi.seahorse-butterfly.ts.net`. `apiUrl()` strips a trailing slash or `/api` suffix,
  then appends `/api<path>`. So every path below is served under `/api` on the host.
- **Auth** — none. Reachable only over the user's Tailnet.
- **Transport** — JSON over `fetch`, 10s abort timeout (`util.ts`). Images fetched with `Accept: image/*`.
- **Robustness** — TripTap type-checks every field. Missing/wrong-typed optional fields become `null`;
  an unreadable object is dropped. Only `id` (+ `name` or `title`) are truly required per object.

---

## Read endpoints

### `GET /api/tags`
All flat tags. Returns an **array of tag objects**. TripTap filters client-side by `parentId` to get one
parent tag's children.

Tag object (→ `TagTermOption` via `toOption`):
```jsonc
{
  "id": "string",              // required
  "name": "string",            // required
  "parentId": "string | null", // adjacency; null at top level. Non-string → null
  "slug": "string | null",     // optional
  "description": "string | null" // optional
}
```

### `GET /api/taxonomies`
All taxonomies. Returns an **array of taxonomy objects** (→ `BookmarksTaxonomy` via `toTaxonomy`):
```jsonc
{
  "id": "string",          // required
  "name": "string",        // required
  "slug": "string",        // optional → "" when absent
  "hierarchical": "bool",  // terms nest via parentId
  "singleValue": "bool",   // owner may hold at most one term
  "icon": "string | null",
  "termCount": "number"    // optional → 0 when absent
}
```

### `GET /api/taxonomies/{taxonomyId}/terms`
The terms of one taxonomy. Returns an **array of term objects** — same shape as a tag object above
(`toOption` → `TagTermOption`), `parentId` linking a term to its parent term.

### `GET /api/bookmarks?tags={tagId}`
Bookmarks carrying a given **tag** id. Returns an **array of bookmark objects**. **Only matches tag ids**
— taxonomy term ids never resolve here (use the assignment map instead). TripTap queries the parent tag
plus each child tag, then dedupes by `id`.

Bookmark object — consumed fields (mapped by `toBookmarkRecord` / `toBookmarkResource`):
```jsonc
{
  "id": "string",           // required
  "title": "string",        // required
  "url": "string | null",   // primary link (e.g. the video URL)

  // — used only by the single-record fetch, for timestamp sections —
  "sectionsValues": [
    {
      "sections": [
        {
          "id": "string",
          "name": "string | null",      // → section label
          "type": "timestamp | ...",    // only "timestamp" entries are kept
          "startValue": "string",       // e.g. "00:01:23.400" or "83"; must be non-empty
          "endValue": "string",         // must be non-empty
          "children": [ /* same shape, recursively */ ]
        }
      ]
    }
  ],

  // — used only by the "Find a Resource" / resource widening (toBookmarkResource) —
  "website":   { "domain": "string", "siteName": "string" }, // either alone is enough
  "numberValues": [ { "propertyId": "string", "value": "number" } ], // runtime lookup
  "mediaType": { "name": "string" },                          // e.g. "Video", "Podcast"
  "image":     { "url": "string" }  // relative /api/bookmarks/{id}/images/{imageId} path
}
```
Notes:
- `flattenTimestampSections` walks `sectionsValues[].sections[]` **recursively** (via `children`), keeping
  only `type === "timestamp"` entries with non-empty `startValue` **and** `endValue`.
- `image.url` is a **relative** path pointing back at the host's own image endpoint. TripTap passes it
  through verbatim so it hits TripTap's same-origin image proxy (below).

### `GET /api/bookmarks/{id}`
One bookmark by id. Returns a **single bookmark object** (same shape). This is the fetch that populates
`sections` (timestamp sections); the list endpoints leave `sections` empty.

### `GET /api/taxonomy-assignments/by-owner-type/{taxonomyId}/bookmark`
The bookmark→term assignment map for one taxonomy, scoped to owner type `bookmark`. Needed because
`?tags=` can't find bookmarks by taxonomy term. Returns an **object map**:
```jsonc
{
  "<bookmarkId>": ["<termId>", "<termId>"],
  "...": [ ... ]
}
```
TripTap reverses it: given the term ids in scope (a drilled-down term + its children, or the whole
taxonomy), collect every `bookmarkId` whose term list intersects, then fetch each by id.

### `GET /api/custom-properties`
All custom property definitions. Used to resolve the **"Runtime"** property id so a bookmark's runtime can
be read out of `numberValues`. Returns an **array**:
```jsonc
{
  "id": "string",
  "name": "string",           // matched case-insensitively to "runtime" first
  "type": "number | ...",     // fallback match: type "number"
  "numberFormat": "duration | ..." // fallback match: numberFormat "duration"
}
```
Resolution order: exact `name === "runtime"` (case-insensitive), else first `type: "number"` +
`numberFormat: "duration"`. A failed lookup degrades runtime to `null` rather than failing the request.

### `GET /api/bookmarks/{bookmarkId}/images/{imageId}[?v=...]`
Raw thumbnail bytes (`image/*`). TripTap proxies these so the browser loads them same-origin; the
optional `?v=` cache-buster from the upstream `image.url` is forwarded verbatim. Response is binary with
its upstream `Content-Type`; TripTap re-serves it with `Cache-Control: private, max-age=86400`.

---

## Write endpoints

### `POST /api/tags`
Create a **child tag** under a parent tag.
```jsonc
// request body
{ "name": "string", "parentId": "string" }   // parentId required for this path
```
Returns the created **tag object** (→ `TagTermOption`). A response that can't be read as `{id, name}`
raises `BookmarksUnavailableError` (502).

### `POST /api/taxonomies/{taxonomyId}/terms`
Create a **taxonomy term**, optionally nested under a parent term.
```jsonc
// request body
{ "name": "string", "parentId": "string" }   // parentId omitted for a top-level term
```
Returns the created **term object** (→ `TagTermOption`). Same unreadable-response handling as above.

Which one TripTap calls is decided by the channel's source kind (`createVocabularyTerm` in `index.ts`):
`kind: "taxonomy"` → term (nested under the drill-down `termId` when set); `kind: "tag"` → child tag.

---

## Endpoint → middleware function map

| Upstream call | `services/bookmarks/index.ts` fn | TripTap proxy route |
|---|---|---|
| `GET /api/tags` | `fetchTags`, `fetchVocabulary` (tag kind) | `GET /api/bookmarks/tags`, `/vocabulary` |
| `GET /api/taxonomies` | `fetchTaxonomies` | `GET /api/bookmarks/taxonomies` |
| `GET /api/taxonomies/{id}/terms` | `fetchTerms`, `fetchVocabulary` (taxonomy kind) | `GET /api/bookmarks/taxonomies/:id/terms`, `/vocabulary` |
| `GET /api/bookmarks?tags=` | `fetchRawBookmarksByTag` → `listBookmarksForCategory`, `listBookmarksByTag` | `GET /api/bookmarks/records`, `/by-tag/:tagId` |
| `GET /api/bookmarks/{id}` | `fetchRawBookmarkById`, `getBookmark` | `GET /api/bookmarks/records/:id` |
| `GET /api/taxonomy-assignments/by-owner-type/{id}/bookmark` | `fetchTaxonomyBookmarkAssignments` | *(internal; feeds records/resources)* |
| `GET /api/custom-properties` | `resolveRuntimePropertyId` | *(internal; feeds resources)* |
| `GET /api/bookmarks/{id}/images/{imageId}` | `getBookmarkImage` | `GET /api/bookmarks/:bookmarkId/images/:imageId` |
| `POST /api/tags` | `createTag` | `POST /api/bookmarks/terms` |
| `POST /api/taxonomies/{id}/terms` | `createTerm` | `POST /api/bookmarks/terms` |

`listBookmarkResources` (proxy `GET /api/bookmarks/resources`) composes several of the above: it resolves
the resource channel's source, reads the runtime property, lists the source's bookmarks (tag or taxonomy
branch), widens each to a `BookmarkResource`, and keeps only those with a runtime.

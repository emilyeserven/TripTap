import { describe, expect, it } from "vitest";

import { bookmarkAppUrl, DEFAULT_BOOKMARKS_APP_URL } from "./bookmarks";

describe("bookmarkAppUrl", () => {
  it("uses the default base when the endpoint is null/empty/whitespace", () => {
    expect(bookmarkAppUrl(null, "abc")).toBe(`${DEFAULT_BOOKMARKS_APP_URL}/bookmarks/abc`);
    expect(bookmarkAppUrl(undefined, "abc")).toBe(`${DEFAULT_BOOKMARKS_APP_URL}/bookmarks/abc`);
    expect(bookmarkAppUrl("   ", "abc")).toBe(`${DEFAULT_BOOKMARKS_APP_URL}/bookmarks/abc`);
  });

  it("uses a configured endpoint", () => {
    expect(bookmarkAppUrl("https://marks.example", "abc")).toBe("https://marks.example/bookmarks/abc");
  });

  it("tolerates a trailing slash and a trailing /api suffix", () => {
    expect(bookmarkAppUrl("https://marks.example/", "abc")).toBe("https://marks.example/bookmarks/abc");
    expect(bookmarkAppUrl("https://marks.example/api", "abc")).toBe("https://marks.example/bookmarks/abc");
    expect(bookmarkAppUrl("https://marks.example/api/", "abc")).toBe("https://marks.example/bookmarks/abc");
  });

  it("url-encodes the bookmark id", () => {
    expect(bookmarkAppUrl("https://marks.example", "a b/c")).toBe("https://marks.example/bookmarks/a%20b%2Fc");
  });
});

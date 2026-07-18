import { describe, expect, it } from "vitest";

import { parseEntryFromHtml } from "./appVersion";

describe("parseEntryFromHtml", () => {
  it("extracts the hashed entry bundle from a vite index.html", () => {
    const html = `<!doctype html><html><head>
      <link rel="modulepreload" href="/assets/vendor-abc123.js" />
      <script type="module" crossorigin src="/assets/index-BJHdKyao.js"></script>
    </head><body><div id="root"></div></body></html>`;
    expect(parseEntryFromHtml(html)).toBe("/assets/index-BJHdKyao.js");
  });

  it("returns null when no module entry script is present", () => {
    expect(parseEntryFromHtml("<html><head></head><body></body></html>")).toBeNull();
  });

  it("returns null for an empty response", () => {
    expect(parseEntryFromHtml("")).toBeNull();
  });
});

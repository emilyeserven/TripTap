import { describe, expect, it } from "vitest";

import { htmlToMarkdown, markdownToHtml } from "./notesMarkdown";

describe("markdownToHtml", () => {
  it("renders headings, bold, lists, and links to HTML", () => {
    const html = markdownToHtml("# Title\n\nSome **bold** and a [link](https://x.test).\n\n- one\n- two");
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<a href=\"https://x.test\">link</a>");
    expect(html).toContain("<li>one</li>");
  });
});

describe("htmlToMarkdown", () => {
  it("serializes HTML back to markdown (atx headings, dash bullets)", () => {
    const md = htmlToMarkdown("<h2>Notes</h2><p>a <strong>b</strong></p><ul><li>x</li><li>y</li></ul>");
    expect(md).toContain("## Notes");
    expect(md).toContain("**b**");
    expect(md).toContain("- x");
    expect(md).toContain("- y");
  });
});

describe("round-trip", () => {
  it("preserves the structure of representative notes through md → html → md", () => {
    const source = "# Lesson\n\nKey point with **emphasis** and a [ref](https://x.test).\n\n- alpha\n- beta";
    const round = htmlToMarkdown(markdownToHtml(source));
    expect(round).toContain("# Lesson");
    expect(round).toContain("**emphasis**");
    expect(round).toContain("[ref](https://x.test)");
    expect(round).toContain("- alpha");
    expect(round).toContain("- beta");
  });
});

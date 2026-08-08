import type { BookmarkResource } from "@sentence-bank/types";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ResourceRow } from "./ResourceRow";

function resource(over: Partial<BookmarkResource> & { id: string;
  title: string; }): BookmarkResource {
  return {
    url: null,
    imageUrl: null,
    mediaType: "Book",
    tagIds: [],
    favorite: false,
    progress: null,
    ...over,
  } as BookmarkResource;
}

describe("ResourceRow", () => {
  it("shows placeholder cards while loading with no resources yet", () => {
    const {
      container,
    } = render(
      <ResourceRow
        resources={[]}
        areaTags={{}}
        loading
        emptyText="No Book resources yet."
      />,
    );
    // Skeletons render; the empty note does not.
    expect(container.querySelectorAll("[data-slot=skeleton]").length).toBeGreaterThan(0);
    expect(screen.queryByText("No Book resources yet.")).toBeNull();
  });

  it("shows the empty note when not loading and there are no resources", () => {
    const {
      container,
    } = render(
      <ResourceRow
        resources={[]}
        areaTags={{}}
        emptyText="No Book resources yet."
      />,
    );
    expect(screen.getByText("No Book resources yet.")).toBeTruthy();
    expect(container.querySelectorAll("[data-slot=skeleton]").length).toBe(0);
  });

  it("renders resources once loaded, not skeletons", () => {
    const {
      container,
    } = render(
      <ResourceRow
        resources={[resource({
          id: "b1",
          title: "Genki I",
        })]}
        areaTags={{}}
        loading
      />,
    );
    // Real data present → show it even if a stale `loading` flag lingers.
    expect(screen.getByText("Genki I")).toBeTruthy();
    expect(container.querySelectorAll("[data-slot=skeleton]").length).toBe(0);
  });
});

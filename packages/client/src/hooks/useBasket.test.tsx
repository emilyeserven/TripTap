import type { BasketItem } from "@/stores/basketStore";

import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useBasketItems, useBasketToggle } from "./useBasket";

import { useBasketStore } from "@/stores/basketStore";
import { renderWithQuery } from "@/test-utils/renderWithQuery";

const updateVocab = vi.fn();
const updateLessonVocab = vi.fn();
const updateGrammarNote = vi.fn();
const updateStartSettings = vi.fn();

const starredVocab = vi.fn<() => unknown[]>(() => []);
const starredNotes = vi.fn<() => unknown[]>(() => []);
const favoriteResourceIds = vi.fn<() => string[]>(() => []);

vi.mock("@/hooks/useVocab", () => ({
  useVocab: () => ({
    data: starredVocab(),
  }),
  useUpdateVocab: () => ({
    mutate: updateVocab,
    isPending: false,
  }),
}));

vi.mock("@/hooks/useAiLessons", () => ({
  useAiLessonContent: () => ({
    data: {
      vocab: [],
    },
  }),
  useUpdateVocabRenshuu: () => ({
    mutate: updateLessonVocab,
    isPending: false,
  }),
}));

vi.mock("@/hooks/useGrammarNotes", () => ({
  useGrammarNotes: () => ({
    data: starredNotes(),
  }),
  useUpdateGrammarNote: () => ({
    mutate: updateGrammarNote,
    isPending: false,
  }),
}));

vi.mock("@/hooks/useSettings", () => ({
  useStartSettings: () => ({
    data: {
      favoriteResourceIds: favoriteResourceIds(),
    },
  }),
  useUpdateStartSettings: () => ({
    mutate: updateStartSettings,
    isPending: false,
  }),
}));

vi.mock("@/hooks/useBookmarks", () => ({
  useBookmarkResources: () => ({
    data: {
      resources: [{
        id: "r1",
        title: "Genki I",
        imageUrl: null,
      }],
    },
  }),
}));

/** A probe that exposes one item's toggle plus the merged basket contents. */
function Probe({
  item,
}: {
  item: BasketItem;
}) {
  const {
    inBasket, toggle,
  } = useBasketToggle(item);
  const items = useBasketItems();
  return (
    <div>
      <button
        type="button"
        onClick={toggle}
      >
        toggle
      </button>
      <span data-testid="in-basket">{String(inBasket)}</span>
      <span data-testid="keys">{items.map(i => `${i.kind}:${i.id}`).join(",")}</span>
    </div>
  );
}

describe("useBasketToggle", () => {
  beforeEach(() => {
    useBasketStore.setState({
      items: [],
      expanded: false,
    });
    for (const m of [updateVocab, updateLessonVocab, updateGrammarNote, updateStartSettings]) {
      m.mockClear();
    }
    starredVocab.mockReturnValue([]);
    starredNotes.mockReturnValue([]);
    favoriteResourceIds.mockReturnValue([]);
  });

  it("keeps an ephemeral kind local and off the network", () => {
    renderWithQuery(
      <Probe
        item={{
          kind: "sentence",
          id: "s1",
          text: "毎朝コーヒーを飲みます。",
          translation: null,
          reading: null,
          source: "bank",
        }}
      />,
    );
    fireEvent.click(screen.getByText("toggle"));
    expect(useBasketStore.getState().items).toHaveLength(1);
    expect(updateVocab).not.toHaveBeenCalled();
    expect(updateStartSettings).not.toHaveBeenCalled();
  });

  it("writes a bank vocab item through to its starred column", () => {
    renderWithQuery(
      <Probe
        item={{
          kind: "vocab",
          id: "v1",
          term: "毎朝",
          reading: null,
          meaning: null,
        }}
      />,
    );
    fireEvent.click(screen.getByText("toggle"));
    expect(updateVocab).toHaveBeenCalledWith({
      id: "v1",
      input: {
        starred: true,
      },
    });
    // Nothing lands in the local store — the server row is the membership.
    expect(useBasketStore.getState().items).toHaveLength(0);
  });

  it("writes an AI-lesson vocab item through to its own table", () => {
    renderWithQuery(
      <Probe
        item={{
          kind: "lesson-vocab",
          id: "v1",
          term: "毎朝",
          reading: null,
          meaning: null,
        }}
      />,
    );
    fireEvent.click(screen.getByText("toggle"));
    expect(updateLessonVocab).toHaveBeenCalledWith({
      id: "v1",
      patch: {
        starred: true,
      },
    });
    expect(updateVocab).not.toHaveBeenCalled();
  });

  it("writes a grammar note through to its starred column", () => {
    renderWithQuery(
      <Probe
        item={{
          kind: "grammar-note",
          id: "n1",
          title: "は",
          nuance: "topic marker",
        }}
      />,
    );
    fireEvent.click(screen.getByText("toggle"));
    expect(updateGrammarNote).toHaveBeenCalledWith({
      id: "n1",
      input: {
        starred: true,
      },
    });
  });

  it("adds a resource to the stored id list, and removes it again when already there", () => {
    favoriteResourceIds.mockReturnValue(["other"]);
    const item: BasketItem = {
      kind: "resource",
      id: "r1",
      title: "Genki I",
      imageUrl: null,
    };
    const {
      unmount,
    } = renderWithQuery(<Probe item={item} />);
    fireEvent.click(screen.getByText("toggle"));
    expect(updateStartSettings).toHaveBeenCalledWith({
      favoriteResourceIds: ["other", "r1"],
    });
    unmount();

    favoriteResourceIds.mockReturnValue(["other", "r1"]);
    renderWithQuery(<Probe item={item} />);
    expect(screen.getByTestId("in-basket")).toHaveTextContent("true");
    fireEvent.click(screen.getByText("toggle"));
    expect(updateStartSettings).toHaveBeenLastCalledWith({
      favoriteResourceIds: ["other"],
    });
  });

  it("reads membership from the server for a durable kind", () => {
    starredVocab.mockReturnValue([{
      id: "v1",
      term: "毎朝",
      reading: null,
      meaning: null,
      starred: true,
    }]);
    renderWithQuery(
      <Probe
        item={{
          kind: "vocab",
          id: "v1",
          term: "毎朝",
          reading: null,
          meaning: null,
        }}
      />,
    );
    expect(screen.getByTestId("in-basket")).toHaveTextContent("true");
  });
});

describe("useBasketItems", () => {
  beforeEach(() => {
    useBasketStore.setState({
      items: [],
      expanded: false,
    });
    starredVocab.mockReturnValue([]);
    starredNotes.mockReturnValue([]);
    favoriteResourceIds.mockReturnValue([]);
  });

  it("merges the local snapshots with every server-backed kind", () => {
    useBasketStore.setState({
      items: [{
        kind: "sentence",
        id: "s1",
        text: "毎朝コーヒーを飲みます。",
        translation: null,
        reading: null,
        source: "bank",
      }],
    });
    starredVocab.mockReturnValue([{
      id: "v1",
      term: "毎朝",
      reading: null,
      meaning: null,
      starred: true,
    }]);
    starredNotes.mockReturnValue([{
      id: "n1",
      title: "は",
      nuance: null,
      starred: true,
    }]);
    favoriteResourceIds.mockReturnValue(["r1"]);

    renderWithQuery(
      <Probe
        item={{
          kind: "sentence",
          id: "other",
          text: "x",
          translation: null,
          reading: null,
        }}
      />,
    );
    expect(screen.getByTestId("keys")).toHaveTextContent(
      "sentence:s1,vocab:v1,grammar-note:n1,resource:r1",
    );
  });

  it("omits an unstarred row", () => {
    starredVocab.mockReturnValue([{
      id: "v1",
      term: "毎朝",
      reading: null,
      meaning: null,
      starred: false,
    }]);
    renderWithQuery(
      <Probe
        item={{
          kind: "sentence",
          id: "other",
          text: "x",
          translation: null,
          reading: null,
        }}
      />,
    );
    expect(screen.getByTestId("keys")).toHaveTextContent("");
  });
});

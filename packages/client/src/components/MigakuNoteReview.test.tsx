import type { MigakuImportDetail } from "@sentence-bank/types";

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MigakuNoteReview } from "./MigakuNoteReview";

const commitMutate = vi.fn();
const navigate = vi.fn();

vi.mock("@/hooks/useMigakuImports", () => ({
  useCommitMigakuImport: () => ({
    mutate: commitMutate,
    isPending: false,
  }),
  useDeleteMigakuImport: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
}));

vi.mock("@/lib/api", () => ({
  migakuImportsApi: {
    mediaUrl: (id: string, cid: string, which: string) => `/api/migaku-imports/${id}/candidates/${cid}/${which}`,
  },
}));

const detail: MigakuImportDetail = {
  id: "imp-1",
  filename: "deck.apkg",
  format: "migaku",
  deckName: "アニメ",
  status: "parsed",
  candidateCount: 2,
  sentencesCreated: null,
  vocabCreated: null,
  skipped: null,
  createdAt: "2026-07-18T00:00:00Z",
  candidates: [
    {
      id: "v1",
      kind: "vocab",
      text: "ドジっ子",
      reading: [{
        t: "ドジっ子",
        r: "どじっこ",
      }],
      meaning: "clumsy girl",
      notes: "An endearingly clumsy girl.",
      tags: "migaku",
      hasAudio: true,
      hasImage: false,
      alreadyExists: false,
    },
    {
      id: "s1",
      kind: "sentence",
      text: "ドジっ子魔女。",
      reading: [],
      meaning: "Clumsy witch.",
      notes: null,
      tags: "migaku",
      hasAudio: true,
      hasImage: true,
      alreadyExists: false,
    },
  ],
  noteGroups: [
    {
      id: "g1",
      vocabId: "v1",
      sentenceIds: ["s1"],
      hasImage: true,
    },
  ],
};

describe("MigakuNoteReview", () => {
  beforeEach(() => {
    commitMutate.mockReset();
    navigate.mockReset();
  });

  it("renders the grouped word and its sentence", () => {
    render(<MigakuNoteReview detail={detail} />);
    expect(screen.getByDisplayValue("ドジっ子")).toBeInTheDocument();
    expect(screen.getByDisplayValue("ドジっ子魔女。")).toBeInTheDocument();
    expect(screen.getByDisplayValue("An endearingly clumsy girl.")).toBeInTheDocument();
    expect(screen.getByText("Word")).toBeInTheDocument();
    // "Sentence" appears as both a badge and a field label, so assert the translation instead.
    expect(screen.getByDisplayValue("Clumsy witch.")).toBeInTheDocument();
  });

  it("commits with grouped link + image intent and per-item edits", () => {
    render(<MigakuNoteReview detail={detail} />);
    fireEvent.click(screen.getByRole("button", {
      name: /Import 2 item/,
    }));

    expect(commitMutate).toHaveBeenCalledTimes(1);
    const [payload] = commitMutate.mock.calls[0];
    expect(payload.id).toBe("imp-1");
    expect(payload.input.groups).toEqual([
      {
        id: "g1",
        link: true,
        imageTarget: "sentence",
      },
    ]);
    const vocabItem = payload.input.items.find((i: { id: string }) => i.id === "v1");
    expect(vocabItem).toMatchObject({
      kind: "vocab",
      text: "ドジっ子",
      notes: "An endearingly clumsy girl.",
      dedupAction: "link",
    });
    const sentenceItem = payload.input.items.find((i: { id: string }) => i.id === "s1");
    expect(sentenceItem).toMatchObject({
      kind: "sentence",
      text: "ドジっ子魔女。",
      meaning: "Clumsy witch.",
      notes: null,
    });
  });
});

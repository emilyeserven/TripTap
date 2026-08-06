import type { ExportItem } from "./ExportPanel";

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { ExportPanel } from "./ExportPanel";

import { useBasketStore } from "@/stores/basketStore";

function item(over: Partial<ExportItem> & { id: string;
  label: string; }): ExportItem {
  return {
    sublabel: "",
    secondary: "translation",
    eligible: true,
    sourceId: null,
    searchExtra: [],
    ...over,
  };
}

const ITEMS: ExportItem[] = [
  item({
    id: "s1",
    label: "犬が好きです。",
  }),
  item({
    id: "s2",
    label: "猫も好きです。",
  }),
  // In the panel, but with nothing to put in the second column — can't produce an export row.
  item({
    id: "s3",
    label: "未訳の文",
    secondary: null,
    eligible: false,
  }),
];

function renderPanel(basketKind?: "sentence" | "vocab") {
  return render(
    <ExportPanel
      items={ITEMS}
      sources={undefined}
      storageKey="test-export"
      pickerHint="hint"
      outputHint="output hint"
      outputLabel="Export text"
      basketKind={basketKind}
      toText={selected => selected.map(i => i.label).join("\n")}
    />,
  );
}

describe("ExportPanel — basket bridge", () => {
  beforeEach(() => {
    globalThis.localStorage?.clear();
    useBasketStore.setState({
      items: [],
    });
  });

  it("offers no basket button when the mode has no basket kind", () => {
    renderPanel();
    expect(screen.queryByRole("button", {
      name: /Add basket/,
    })).not.toBeInTheDocument();
  });

  it("counts only basket items of the right kind that this panel can export", () => {
    useBasketStore.setState({
      items: [
        {
          kind: "sentence",
          id: "s1",
          text: "犬が好きです。",
          translation: "I like dogs.",
          reading: null,
        },
        // Ineligible — no translation to export.
        {
          kind: "sentence",
          id: "s3",
          text: "未訳の文",
          translation: null,
          reading: null,
        },
        // Wrong kind for a sentence panel.
        {
          kind: "vocab",
          id: "v1",
          term: "犬",
          reading: "いぬ",
          meaning: "dog",
        },
        // Collected from a page this panel doesn't list.
        {
          kind: "sentence",
          id: "unknown",
          text: "?",
          translation: "?",
          reading: null,
        },
      ],
    });

    renderPanel("sentence");
    expect(screen.getByRole("button", {
      name: /Add basket \(1\)/,
    })).toBeEnabled();
  });

  it("adds the basket's exportable items to the export list", () => {
    useBasketStore.setState({
      items: [
        {
          kind: "sentence",
          id: "s2",
          text: "猫も好きです。",
          translation: "I like cats too.",
          reading: null,
        },
      ],
    });

    renderPanel("sentence");
    fireEvent.click(screen.getByRole("button", {
      name: /Add basket \(1\)/,
    }));

    expect(screen.getByLabelText("Export text")).toHaveValue("猫も好きです。");
    // Consumed — it's in the list now, so there's nothing left to add.
    expect(screen.getByRole("button", {
      name: /Add basket \(0\)/,
    })).toBeDisabled();
  });
});

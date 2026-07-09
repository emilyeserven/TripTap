import type { VocabItem } from "@sentence-bank/types";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { VocabCard } from "./VocabCard";

const vocab: VocabItem = {
  id: "v1",
  sortOrder: 0,
  jp: "宿",
  yomi: "やど",
  en: "inn, lodging",
  lvl: "N5",
  cat: "lodging",
  renshuuAdded: false,
  renshuuList: null,
};

describe("VocabCard renshuu annotation", () => {
  it("reports a checkbox toggle when editable", () => {
    const onRenshuuChange = vi.fn();
    render(
      <VocabCard
        vocab={vocab}
        onRenshuuChange={onRenshuuChange}
      />,
    );
    fireEvent.click(screen.getByRole("checkbox", {
      name: /In Renshuu/,
    }));
    expect(onRenshuuChange).toHaveBeenCalledWith({
      renshuuAdded: true,
    });
  });

  it("shows a read-only badge (no checkbox) when not editable and tracked", () => {
    render(
      <VocabCard
        vocab={{
          ...vocab,
          renshuuAdded: true,
          renshuuList: "Hagi trip",
        }}
      />,
    );
    expect(screen.getByText("Renshuu · Hagi trip")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("shows nothing renshuu-related when not editable and untracked", () => {
    render(<VocabCard vocab={vocab} />);
    expect(screen.queryByText(/Renshuu/)).not.toBeInTheDocument();
  });
});

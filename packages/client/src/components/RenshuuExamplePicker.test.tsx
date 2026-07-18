import type { RenshuuExampleSentence } from "@sentence-bank/types";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RenshuuExamplePicker } from "./RenshuuExamplePicker";

const mutateAsync = vi.fn();

const examples: RenshuuExampleSentence[] = [
  {
    id: 2184,
    text: "一度に沢山食べると、お腹を壊すよ。",
    reading: "いちどにたくさんたべると、おなかをこわすよ。",
    translation: "If you eat too much at once, you'll get a stomachache.",
  },
  {
    id: 22244,
    text: "犬。",
    reading: null,
    translation: null,
  },
];

// The search hook is a react-query mutation; expose a fixed result set as if a search already ran.
vi.mock("@/hooks/useRenshuu", () => ({
  useRenshuuExamples: () => ({
    data: examples,
    mutate: vi.fn(),
    isPending: false,
    isSuccess: true,
  }),
}));

vi.mock("@/hooks/useSentences", () => ({
  useCreateSentence: () => ({
    mutateAsync,
    isPending: false,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("RenshuuExamplePicker", () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    mutateAsync.mockResolvedValue({});
  });

  it("seeds the search box from the default query", () => {
    render(<RenshuuExamplePicker defaultQuery="食べる" />);
    expect(screen.getByLabelText<HTMLInputElement>("Renshuu search").value).toBe("食べる");
  });

  it("renders each result with its reading and English", () => {
    render(<RenshuuExamplePicker defaultQuery="食べる" />);
    expect(screen.getByText("一度に沢山食べると、お腹を壊すよ。")).toBeInTheDocument();
    expect(screen.getByText("いちどにたくさんたべると、おなかをこわすよ。")).toBeInTheDocument();
    expect(
      screen.getByText("If you eat too much at once, you'll get a stomachache."),
    ).toBeInTheDocument();
  });

  it("imports a sentence into the bank with a renshuu tag and source note", async () => {
    render(<RenshuuExamplePicker defaultQuery="食べる" />);
    fireEvent.click(screen.getAllByRole("button", {
      name: "Add to sentence bank",
    })[0]);

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(mutateAsync).toHaveBeenCalledWith({
      text: "一度に沢山食べると、お腹を壊すよ。",
      translation: "If you eat too much at once, you'll get a stomachache.",
      language: "Japanese",
      tags: "renshuu",
      notes: "From Renshuu #2184",
    });

    // After importing, the row's action flips to a disabled "Added" state.
    await waitFor(() => expect(screen.getByRole("button", {
      name: "Added to bank",
    })).toBeDisabled());
  });
});

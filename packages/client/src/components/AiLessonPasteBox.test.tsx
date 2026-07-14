import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AiLessonPasteBox } from "./AiLessonPasteBox";

import { aiLessonImportFixture } from "@/test-utils/aiLessonFixture";

const {
  mutateAsync, navigate,
} = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("@/hooks/useAiLessons", () => ({
  useImportAiLesson: () => ({
    mutateAsync,
    isPending: false,
  }),
}));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigate,
}));

describe("AiLessonPasteBox", () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    navigate.mockReset();
  });

  it("shows an error and does not import when the JSON is invalid", async () => {
    render(<AiLessonPasteBox />);
    fireEvent.change(screen.getByLabelText("AI Lesson JSON"), {
      target: {
        value: "{ not json",
      },
    });
    fireEvent.click(screen.getByRole("button", {
      name: /Validate & import/,
    }));

    expect(await screen.findByText(/Invalid JSON/)).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("shows a validation error when JSON is valid but violates the contract", async () => {
    render(<AiLessonPasteBox />);
    fireEvent.change(screen.getByLabelText("AI Lesson JSON"), {
      target: {
        value: JSON.stringify({
          slug: "x",
        }),
      },
    });
    fireEvent.click(screen.getByRole("button", {
      name: /Validate & import/,
    }));

    expect((await screen.findAllByText(/Invalid input/)).length).toBeGreaterThan(0);
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("imports and navigates when the JSON is valid", async () => {
    mutateAsync.mockResolvedValue({
      ...aiLessonImportFixture,
      id: "l1",
      createdAt: "x",
    });
    render(<AiLessonPasteBox />);
    fireEvent.change(screen.getByLabelText("AI Lesson JSON"), {
      target: {
        value: JSON.stringify(aiLessonImportFixture),
      },
    });
    fireEvent.click(screen.getByRole("button", {
      name: /Validate & import/,
    }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledOnce());
    expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({
      slug: "cafe-basics",
    }));
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({
        to: "/ai-lessons/$slug",
        params: {
          slug: "cafe-basics",
        },
      }));
  });
});

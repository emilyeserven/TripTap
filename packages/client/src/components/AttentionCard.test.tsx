import type { AttentionGroup } from "@/lib/attention";

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AttentionCard } from "./AttentionCard";

const mockGroups = vi.hoisted(() => ({
  value: [] as AttentionGroup[],
}));

vi.mock("@/hooks/useAttention", () => ({
  useAttention: () => ({
    groups: mockGroups.value,
    isLoading: false,
  }),
}));

// The card only renders <Link>s; a plain anchor stub keeps the test router-free.
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to, children, className,
  }: { to: string;
    children: React.ReactNode;
    className?: string; }) => (
    <a
      href={to}
      className={className}
    >
      {children}
    </a>
  ),
}));

describe("AttentionCard", () => {
  it("renders nothing while the inbox is empty", () => {
    mockGroups.value = [];
    const {
      container,
    } = render(<AttentionCard />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows one counts-only row per group, linking to the inbox", () => {
    mockGroups.value = [
      {
        kind: "sentence-correction",
        label: "Sentences to correct",
        items: [],
        count: 3,
      },
      {
        kind: "flashcard-pending",
        label: "Flashcards to make",
        items: [],
        count: 7,
      },
    ];
    render(<AttentionCard />);
    expect(screen.getByText("Needs your attention")).toBeInTheDocument();
    expect(screen.getByText("Sentences to correct")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Flashcards to make")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });
});

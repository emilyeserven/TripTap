import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StreakBadge } from "./StreakBadge";

describe("StreakBadge", () => {
  it("renders nothing without a streak (no daily goal set)", () => {
    const {
      container,
    } = render(<StreakBadge streak={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the current and best streak", () => {
    render(
      <StreakBadge
        streak={{
          current: 5,
          best: 12,
          todayMet: true,
        }}
      />,
    );
    expect(screen.getByText(/5.*-day streak/s)).toBeInTheDocument();
    expect(screen.getByText(/best 12/)).toBeInTheDocument();
    expect(screen.queryByText(/keep it/)).not.toBeInTheDocument();
  });

  it("nudges to meet today's goal while a streak is at risk", () => {
    render(
      <StreakBadge
        streak={{
          current: 3,
          best: 3,
          todayMet: false,
        }}
      />,
    );
    expect(screen.getByText(/meet today's goal to keep it/)).toBeInTheDocument();
  });
});

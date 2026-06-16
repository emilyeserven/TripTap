import type { Trip } from "@triptap/types";

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TripCard } from "./TripCard";

const trip: Trip = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Weekend in Lisbon",
  destination: "Lisbon, Portugal",
  startDate: "2026-07-10",
  endDate: "2026-07-13",
  notes: "Pastéis de nata tour.",
  createdAt: "2026-06-01T00:00:00.000Z",
};

describe("TripCard", () => {
  it("renders the trip name and destination", () => {
    render(<TripCard trip={trip} />);
    expect(screen.getByText("Weekend in Lisbon")).toBeInTheDocument();
    expect(screen.getByText("Lisbon, Portugal")).toBeInTheDocument();
  });

  it("calls onDelete with the trip id when the delete button is clicked", () => {
    const onDelete = vi.fn();
    render(
      <TripCard
        trip={trip}
        onDelete={onDelete}
      />,
    );
    screen.getByRole("button", {
      name: "Delete",
    }).click();
    expect(onDelete).toHaveBeenCalledWith(trip.id);
  });
});

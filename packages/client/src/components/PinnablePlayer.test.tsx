import { useEffect } from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PinnablePlayer } from "./PinnablePlayer";

/** A child that reports each mount so tests can assert it is never remounted across a pin toggle. */
function MountProbe({
  onMount,
}: {
  onMount: () => void;
}) {
  useEffect(() => {
    onMount();
  }, [onMount]);
  return <div data-testid="player">player</div>;
}

describe("PinnablePlayer", () => {
  it("toggles the pinned (sticky) state via the pin button without remounting the player", () => {
    const onMount = vi.fn();
    render(
      <PinnablePlayer>
        <MountProbe onMount={onMount} />
      </PinnablePlayer>,
    );

    // Mounted exactly once before any interaction.
    expect(onMount).toHaveBeenCalledTimes(1);

    const player = screen.getByTestId("player");
    // Not sticky until pinned.
    expect(player.closest(".sticky")).toBeNull();

    fireEvent.click(screen.getByRole("button", {
      name: "Pin video",
    }));

    // Now docked (sticky) and the button flips to "Unpin video".
    expect(player.closest(".sticky")).not.toBeNull();
    expect(screen.getByRole("button", {
      name: "Unpin video",
    })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", {
      name: "Unpin video",
    }));
    expect(player.closest(".sticky")).toBeNull();

    // The player element survived both toggles — never torn down and rebuilt.
    expect(onMount).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("player")).toBe(player);
  });

  it("hides the pin button and never pins when canPin is false", () => {
    render(
      <PinnablePlayer canPin={false}>
        <div data-testid="player">stopwatch</div>
      </PinnablePlayer>,
    );

    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByTestId("player").closest(".sticky")).toBeNull();
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WordExampleLookup } from "./WordExampleLookup";

// The popover content is unmounted while closed, so these assertions only touch the trigger button —
// no QueryClient needed for the example-lookup pickers inside.
describe("WordExampleLookup", () => {
  it("disables the trigger until the row has a word to search", () => {
    render(<WordExampleLookup word="  " />);
    expect(screen.getByRole("button", {
      name: "Find example sentences",
    })).toBeDisabled();
  });

  it("enables the trigger once there is a word", () => {
    render(<WordExampleLookup word="食べる" />);
    expect(screen.getByRole("button", {
      name: "Find example sentences",
    })).toBeEnabled();
  });
});

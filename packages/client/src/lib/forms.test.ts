// @vitest-environment node
import type { KeyboardEvent } from "react";

import { describe, expect, it, vi } from "vitest";

import { blockEnterSubmit } from "./forms";

function keyEvent(
  key: string,
  isComposing = false,
): KeyboardEvent<HTMLInputElement> {
  return {
    key,
    nativeEvent: {
      isComposing,
    },
    preventDefault: vi.fn(),
  } as unknown as KeyboardEvent<HTMLInputElement>;
}

describe("blockEnterSubmit", () => {
  it("prevents a plain Enter from submitting the form", () => {
    const e = keyEvent("Enter");
    blockEnterSubmit(e);
    expect(e.preventDefault).toHaveBeenCalledOnce();
  });

  it("lets Enter through while an IME is composing (candidate confirmation)", () => {
    const e = keyEvent("Enter", true);
    blockEnterSubmit(e);
    expect(e.preventDefault).not.toHaveBeenCalled();
  });

  it("ignores other keys", () => {
    const e = keyEvent("a");
    blockEnterSubmit(e);
    expect(e.preventDefault).not.toHaveBeenCalled();
  });
});

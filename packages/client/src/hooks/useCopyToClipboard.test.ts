import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useCopyToClipboard } from "./useCopyToClipboard";

describe("useCopyToClipboard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("uses the async Clipboard API when available and sets copied", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText,
      },
    });

    const {
      result,
    } = renderHook(() => useCopyToClipboard());
    await act(async () => {
      await result.current.copy("hello");
    });

    expect(writeText).toHaveBeenCalledWith("hello");
    expect(result.current.copied).toBe(true);
  });

  it("falls back to execCommand on the passed element when clipboard is unavailable", async () => {
    vi.stubGlobal("navigator", {});
    // jsdom doesn't implement execCommand, so define it for this test and clean up after.
    const execCommand = vi.fn().mockReturnValue(true);
    (globalThis.document as unknown as { execCommand: unknown }).execCommand = execCommand;

    const el = {
      focus: vi.fn(),
      select: vi.fn(),
    } as unknown as HTMLTextAreaElement;

    const {
      result,
    } = renderHook(() => useCopyToClipboard());
    await act(async () => {
      await result.current.copy("hello", el);
    });

    expect(el.focus).toHaveBeenCalled();
    expect(el.select).toHaveBeenCalled();
    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(result.current.copied).toBe(true);

    delete (globalThis.document as unknown as { execCommand?: unknown }).execCommand;
  });

  it("reports not-copied when neither path is available", async () => {
    vi.stubGlobal("navigator", {});

    const {
      result,
    } = renderHook(() => useCopyToClipboard());
    await act(async () => {
      await result.current.copy("hello");
    });

    expect(result.current.copied).toBe(false);
  });

  it("clears copied after resetAfterMs for callers that flash the flag", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText,
      },
    });

    const {
      result,
    } = renderHook(() => useCopyToClipboard({
      resetAfterMs: 1500,
    }));
    await act(async () => {
      await result.current.copy("hello");
    });
    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.copied).toBe(false);

    vi.useRealTimers();
  });

  it("clears copied on demand via reset", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText,
      },
    });

    const {
      result,
    } = renderHook(() => useCopyToClipboard());
    await act(async () => {
      await result.current.copy("hello");
    });
    expect(result.current.copied).toBe(true);

    act(() => {
      result.current.reset();
    });
    expect(result.current.copied).toBe(false);
  });
});

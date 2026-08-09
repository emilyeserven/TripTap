import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Copy text to the clipboard with a `copied` feedback flag. Falls back to the deprecated
 * `document.execCommand("copy")` (via the passed element) when the async Clipboard API is
 * unavailable — the app is served over plain HTTP on a Tailnet, where `navigator.clipboard`
 * is not exposed. Pass the read-only textarea/input holding the text as `fallbackEl`.
 *
 * Pass `resetAfterMs` for callers that flash "Copied" briefly; callers that clear the flag on
 * their own events (e.g. the export selection changing) use the returned `reset` instead.
 */
export function useCopyToClipboard({
  resetAfterMs,
}: { resetAfterMs?: number } = {}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current !== null) {
      globalThis.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  // Don't leave a pending timer to fire a state update after unmount.
  useEffect(() => clearTimer, [clearTimer]);

  const reset = useCallback(() => {
    clearTimer();
    setCopied(false);
  }, [clearTimer]);

  const markCopied = useCallback((value: boolean) => {
    clearTimer();
    setCopied(value);
    if (value && resetAfterMs !== undefined) {
      timer.current = globalThis.setTimeout(() => {
        timer.current = null;
        setCopied(false);
      }, resetAfterMs);
    }
  }, [clearTimer, resetAfterMs]);

  const copy = useCallback(async (
    text: string,
    fallbackEl?: HTMLTextAreaElement | HTMLInputElement | null,
  ): Promise<boolean> => {
    try {
      if (globalThis.navigator?.clipboard?.writeText) {
        await globalThis.navigator.clipboard.writeText(text);
        markCopied(true);
        return true;
      }
    }
    catch {
      // fall through to the execCommand path below (needed on plain HTTP)
    }
    if (fallbackEl) {
      fallbackEl.focus();
      fallbackEl.select();
      try {
        globalThis.document.execCommand("copy");
        markCopied(true);
        return true;
      }
      catch {
        // ignore — reported via the reset below
      }
    }
    markCopied(false);
    return false;
  }, [markCopied]);

  return {
    copied,
    copy,
    reset,
  };
}

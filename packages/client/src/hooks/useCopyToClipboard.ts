import { useState } from "react";

/**
 * Copy text to the clipboard with a `copied` feedback flag. Falls back to the deprecated
 * `document.execCommand("copy")` (via the passed element) when the async Clipboard API is
 * unavailable — the app is served over plain HTTP on a Tailnet, where `navigator.clipboard`
 * is not exposed. Pass the read-only textarea/input holding the text as `fallbackEl`.
 */
export function useCopyToClipboard() {
  const [copied, setCopied] = useState(false);

  async function copy(text: string, fallbackEl?: HTMLTextAreaElement | HTMLInputElement | null) {
    try {
      if (globalThis.navigator?.clipboard?.writeText) {
        await globalThis.navigator.clipboard.writeText(text);
        setCopied(true);
        return;
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
        setCopied(true);
        return;
      }
      catch {
        // ignore — reported via the reset below
      }
    }
    setCopied(false);
  }

  return {
    copied,
    copy,
  };
}

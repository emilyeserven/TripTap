import type { KeyboardEvent } from "react";

/**
 * Swallow Enter in a single-line input so it doesn't submit — and navigate away from — the surrounding
 * form. Skipped while an IME is composing, so confirming a kana/kanji candidate still works. Attach as
 * the `onKeyDown` of text `<Input>`s that sit inside a form with a submit button.
 */
export function blockEnterSubmit(e: KeyboardEvent<HTMLInputElement>): void {
  if (e.key === "Enter" && !e.nativeEvent.isComposing) e.preventDefault();
}

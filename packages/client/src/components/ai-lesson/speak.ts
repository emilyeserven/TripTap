/** Speak Japanese text via the Web Speech API. No-op if unsupported. */
export function speak(text: string): void {
  try {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ja-JP";
      u.rate = 0.85;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    }
  }
  catch {
    // Speech synthesis is best-effort; ignore failures.
  }
}

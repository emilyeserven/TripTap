import { useState } from "react";

/**
 * A sentence's translation line: shown plainly when `showTranslation` is on, otherwise hidden
 * behind a tap-to-reveal button (study mode). Renders nothing when there is no translation.
 */
export function SentenceTranslationReveal({
  translation,
  showTranslation,
}: {
  translation: string | null;
  showTranslation: boolean;
}) {
  const [revealed, setRevealed] = useState(false);

  if (!translation) return null;
  if (showTranslation) {
    return <p className="text-sm text-muted-foreground">{translation}</p>;
  }
  return (
    <button
      type="button"
      onClick={() => setRevealed(v => !v)}
      className="
        w-full rounded-md border bg-muted/40 px-3 py-2 text-left text-sm
        hover:bg-muted
      "
    >
      {revealed ? translation : "Reveal translation"}
    </button>
  );
}

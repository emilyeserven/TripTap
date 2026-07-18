import { BlurReveal } from "./BlurReveal";

/**
 * A sentence's translation line: shown plainly when `showTranslation` is on, otherwise blurred behind
 * the app's standard {@link BlurReveal} (study mode — hover to peek, click to reveal). Renders nothing
 * when there is no translation.
 */
export function SentenceTranslationReveal({
  translation,
  showTranslation,
}: {
  translation: string | null;
  showTranslation: boolean;
}) {
  if (!translation) return null;
  if (showTranslation) {
    return <p className="text-sm text-muted-foreground">{translation}</p>;
  }
  return (
    <BlurReveal className="text-sm text-muted-foreground">
      {translation}
    </BlurReveal>
  );
}

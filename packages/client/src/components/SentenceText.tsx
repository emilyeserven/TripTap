import type { FuriToken } from "@sentence-bank/types";

import { useFurigana } from "./ai-lesson/furigana-context";

/**
 * Render a sentence with auto-generated furigana. Each kanji run shows ruby when the global furigana
 * toggle is on; kana/latin runs render plain. Falls back to the raw text when no reading was generated.
 */
export function SentenceText({
  text,
  reading,
}: {
  text: string;
  reading: FuriToken[] | null;
}) {
  const showFuri = useFurigana();

  if (!reading || reading.length === 0) return <>{text}</>;

  return (
    <>
      {reading.map((token, i) =>
        (showFuri && token.r
          ? (
            <ruby key={i}>
              {token.t}
              <rt
                className="
                  text-[0.55em] font-normal text-muted-foreground select-none
                "
              >
                {token.r}
              </rt>
            </ruby>
          )
          : <span key={i}>{token.t}</span>))}
    </>
  );
}

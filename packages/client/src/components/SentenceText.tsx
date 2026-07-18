import type { FuriToken } from "@sentence-bank/types";

import { useFurigana } from "./ai-lesson/furigana-context";
import { BlurReveal } from "./BlurReveal";

/**
 * Render a sentence with auto-generated furigana. Each kanji run shows ruby when the global furigana
 * toggle is on; kana/latin runs render plain. Falls back to the raw text when no reading was generated.
 *
 * When `blurFurigana` is set (used for sentences that declare a target vocab — i.e. have linked vocab),
 * each reading is blurred by default and revealed on hover/click, so the reading doesn't spoil recall.
 */
export function SentenceText({
  text,
  reading,
  blurFurigana = false,
}: {
  text: string;
  reading: FuriToken[] | null;
  blurFurigana?: boolean;
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
                {blurFurigana
                  ? <BlurReveal label="Reveal reading">{token.r}</BlurReveal>
                  : token.r}
              </rt>
            </ruby>
          )
          : <span key={i}>{token.t}</span>))}
    </>
  );
}

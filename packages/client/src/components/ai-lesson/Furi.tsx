import { useFurigana } from "./furigana-context";

/** Renders kanji with optional ruby furigana, following the global furigana toggle. */
export function Furi({
  kanji, yomi,
}: { kanji: string;
  yomi?: string; }) {
  const show = useFurigana();
  if (show && yomi) {
    return (
      <ruby>
        {kanji}
        <rt
          className="
            text-[0.55em] font-normal text-muted-foreground select-none
          "
        >{yomi}
        </rt>
      </ruby>
    );
  }
  return <span>{kanji}</span>;
}

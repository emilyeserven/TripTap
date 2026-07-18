import type { MigakuCandidate } from "@sentence-bank/types";

/** Inline ruby preview of a candidate's Migaku-derived furigana; renders nothing when there is none. */
export function MigakuReadingPreview({
  reading,
}: { reading: MigakuCandidate["reading"] }) {
  if (!reading.length) return null;
  return (
    <p
      className="text-lg/loose"
      lang="ja"
    >
      {reading.map((tok, i) =>
        tok.r
          ? (
            <ruby key={i}>
              {tok.t}
              <rt className="text-[0.6em]">{tok.r}</rt>
            </ruby>
          )
          : <span key={i}>{tok.t}</span>)}
    </p>
  );
}

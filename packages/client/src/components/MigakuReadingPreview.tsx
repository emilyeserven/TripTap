import type { MigakuCandidate } from "@sentence-bank/types";

import { SentenceText } from "@/components/SentenceText";

/**
 * Inline ruby preview of a candidate's Migaku-derived furigana; renders nothing when there is none.
 * Delegates to {@link SentenceText} so the preview honours the global furigana toggle and matches how
 * the same reading renders once the candidate is imported.
 */
export function MigakuReadingPreview({
  text,
  reading,
}: {
  text: string;
  reading: MigakuCandidate["reading"];
}) {
  if (!reading.length) return null;
  return (
    <p
      className="text-lg/loose"
      lang="ja"
    >
      <SentenceText
        text={text}
        reading={reading}
      />
    </p>
  );
}

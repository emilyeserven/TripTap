import type { Vocab } from "@sentence-bank/types";

import { vocabApi } from "@/lib/api";

/**
 * The imported-media column beside a vocab entry (image and/or audio from a Migaku import). Renders
 * nothing when the vocab has no media. Mirrors {@link SentenceCardMedia}.
 */
export function VocabBankCardMedia({
  vocab: v,
}: {
  vocab: Vocab;
}) {
  if (!v.hasAudio && !v.hasImage) return null;
  return (
    <div className="flex shrink-0 flex-col items-center gap-2">
      {v.hasImage
        ? (
          <img
            src={vocabApi.imageUrl(v.id)}
            alt=""
            className="max-h-28 max-w-40 rounded-sm border object-contain"
          />
        )
        : null}
      {v.hasAudio
        ? (
          <audio
            controls
            preload="none"
            src={vocabApi.audioUrl(v.id)}
            className="h-8 w-40"
          >
            <track kind="captions" />
          </audio>
        )
        : null}
    </div>
  );
}

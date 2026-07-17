import type { Sentence } from "@sentence-bank/types";

import { sentencesApi } from "@/lib/api";

/**
 * The imported-media column beside a sentence (image and/or audio from a Migaku import). Renders
 * nothing when the sentence has no media.
 */
export function SentenceCardMedia({
  sentence,
}: {
  sentence: Sentence;
}) {
  if (!sentence.hasAudio && !sentence.hasImage) return null;
  return (
    <div className="flex shrink-0 flex-col items-center gap-2">
      {sentence.hasImage
        ? (
          <img
            src={sentencesApi.imageUrl(sentence.id)}
            alt=""
            className="max-h-28 max-w-40 rounded-sm border object-contain"
          />
        )
        : null}
      {sentence.hasAudio
        ? (
          <audio
            controls
            preload="none"
            src={sentencesApi.audioUrl(sentence.id)}
            className="h-8 w-40"
          >
            <track kind="captions" />
          </audio>
        )
        : null}
    </div>
  );
}

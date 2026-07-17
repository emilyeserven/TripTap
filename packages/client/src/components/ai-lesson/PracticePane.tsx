import type { PracticeDirection } from "./PracticeSetupCard";
import type { VocabItem } from "@sentence-bank/types";

import { useState } from "react";

import { PracticeDoneCard } from "./PracticeDoneCard";
import { PracticeLiveCard } from "./PracticeLiveCard";
import { PracticeSetupCard } from "./PracticeSetupCard";
import { shuffle } from "./shuffle";

/**
 * The lesson's flashcard drill: pick a direction, run the shuffled deck one card at a time with
 * self-grading, then review the missed cards or restart. This pane owns the drill state; the three
 * phases render as PracticeSetupCard / PracticeLiveCard / PracticeDoneCard.
 */
export function PracticePane({
  vocab,
}: { vocab: VocabItem[] }) {
  const [dir, setDir] = useState<PracticeDirection>("jp2en");
  const [deck, setDeck] = useState<VocabItem[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [reveal, setReveal] = useState(false);
  const [known, setKnown] = useState<VocabItem[]>([]);
  const [review, setReview] = useState<VocabItem[]>([]);

  const start = (cards: VocabItem[]) => {
    setDeck(shuffle(cards));
    setIdx(0);
    setReveal(false);
    setKnown([]);
    setReview([]);
  };

  const mark = (good: boolean) => {
    if (!deck) return;
    const card = deck[idx];
    if (good) setKnown(k => [...k, card]);
    else setReview(r => [...r, card]);
    setReveal(false);
    setIdx(i => i + 1);
  };

  if (!deck) {
    return (
      <PracticeSetupCard
        cardCount={vocab.length}
        dir={dir}
        onDirChange={setDir}
        onStart={() => start(vocab)}
      />
    );
  }

  if (idx >= deck.length) {
    return (
      <PracticeDoneCard
        knownCount={known.length}
        reviewCount={review.length}
        deckSize={deck.length}
        onReviewMissed={() => start(review)}
        onRestart={() => start(vocab)}
        onChangeSettings={() => setDeck(null)}
      />
    );
  }

  return (
    <PracticeLiveCard
      card={deck[idx]}
      index={idx}
      deckSize={deck.length}
      promptIsJp={dir === "jp2en"}
      reveal={reveal}
      onReveal={() => setReveal(true)}
      onQuit={() => setDeck(null)}
      onMark={mark}
    />
  );
}

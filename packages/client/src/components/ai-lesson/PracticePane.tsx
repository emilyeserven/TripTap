import type { VocabItem } from "@sentence-bank/types";

import { useState } from "react";

import { ArrowRight, Check, RefreshCw, RotateCcw, Volume2 } from "lucide-react";

import { Furi } from "./Furi";
import { LevelBadge } from "./LevelBadge";
import { shuffle } from "./shuffle";
import { speak } from "./speak";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type Direction = "jp2en" | "en2jp";

export function PracticePane({
  vocab,
}: { vocab: VocabItem[] }) {
  const [dir, setDir] = useState<Direction>("jp2en");
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

  // ── Setup ──────────────────────────────────────────────────────────────
  if (!deck) {
    return (
      <Card>
        <CardContent className="space-y-4 py-6">
          <div>
            <h2 className="text-lg font-semibold">練習 — Flashcard drill</h2>
            <p className="text-sm text-muted-foreground">Say the answer aloud, then check yourself.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm">Prompt with</span>
            <Button
              size="sm"
              variant={dir === "jp2en" ? "default" : "outline"}
              onClick={() => setDir("jp2en")}
            >
              日本語 → EN
            </Button>
            <Button
              size="sm"
              variant={dir === "en2jp" ? "default" : "outline"}
              onClick={() => setDir("en2jp")}
            >
              EN → 日本語
            </Button>
          </div>
          <Button
            onClick={() => start(vocab)}
            disabled={vocab.length === 0}
          >
            Start ·
            {" "}
            {vocab.length}
            {" "}
            cards
            <ArrowRight className="size-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Done ───────────────────────────────────────────────────────────────
  if (idx >= deck.length) {
    const pct = deck.length ? Math.round((known.length / deck.length) * 100) : 0;
    return (
      <Card>
        <CardContent className="space-y-4 py-6 text-center">
          <div className="text-4xl font-bold">{pct}%</div>
          <h2 className="text-lg font-semibold">お疲れさま — Nice work</h2>
          <p className="text-sm">
            <strong>{known.length}</strong>
            {" known · "}
            <strong>{review.length}</strong>
            {" to review"}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {review.length > 0 && (
              <Button onClick={() => start(review)}>
                <RotateCcw className="size-4" />
                {" "}
                Review the
                {" "}
                {review.length}
                {" "}
                missed
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => start(vocab)}
            >
              <RefreshCw className="size-4" />
              Restart full deck
            </Button>
            <Button
              variant="ghost"
              onClick={() => setDeck(null)}
            >Change settings
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Live ───────────────────────────────────────────────────────────────
  const card = deck[idx];
  const progress = Math.round((idx / deck.length) * 100);
  const promptIsJp = dir === "jp2en";

  return (
    <div className="space-y-4">
      <Progress value={progress} />
      <div
        className="
          flex items-center justify-between text-sm text-muted-foreground
        "
      >
        <span>
          {idx + 1}
          {" / "}
          {deck.length}
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setDeck(null)}
        >Quit
        </Button>
      </div>
      <Card>
        <CardContent
          className="
            flex min-h-40 flex-col items-center justify-center gap-3 py-6
            text-center
          "
        >
          <div className="text-2xl">
            {promptIsJp
              ? (
                <Furi
                  kanji={card.jp}
                  yomi={card.yomi}
                />
              )
              : card.en}
          </div>
          {promptIsJp && (
            <Button
              size="icon"
              variant="secondary"
              className="size-8"
              aria-label="Hear"
              onClick={() => speak(card.jp)}
            >
              <Volume2 className="size-4" />
            </Button>
          )}
          {reveal
            ? (
              <div className="space-y-1">
                <div className="text-lg font-medium">
                  {promptIsJp
                    ? card.en
                    : (
                      <Furi
                        kanji={card.jp}
                        yomi={card.yomi}
                      />
                    )}
                </div>
                <div className="text-sm text-muted-foreground">{card.yomi}</div>
                <LevelBadge lvl={card.lvl} />
              </div>
            )
            : (
              <Button
                variant="outline"
                onClick={() => setReveal(true)}
              >Show answer
              </Button>
            )}
        </CardContent>
      </Card>
      {reveal && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => mark(false)}
          >
            <RotateCcw className="size-4" />
            Review again
          </Button>
          <Button
            className="flex-1"
            onClick={() => mark(true)}
          >
            <Check className="size-4" />
            Got it
          </Button>
        </div>
      )}
    </div>
  );
}

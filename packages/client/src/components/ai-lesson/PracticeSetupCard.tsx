import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export type PracticeDirection = "jp2en" | "en2jp";

/** The flashcard drill's setup screen: pick the prompt direction and start the deck. */
export function PracticeSetupCard({
  cardCount,
  dir,
  onDirChange,
  onStart,
}: {
  cardCount: number;
  dir: PracticeDirection;
  onDirChange: (dir: PracticeDirection) => void;
  onStart: () => void;
}) {
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
            onClick={() => onDirChange("jp2en")}
          >
            日本語 → EN
          </Button>
          <Button
            size="sm"
            variant={dir === "en2jp" ? "default" : "outline"}
            onClick={() => onDirChange("en2jp")}
          >
            EN → 日本語
          </Button>
        </div>
        <Button
          onClick={onStart}
          disabled={cardCount === 0}
        >
          Start ·
          {" "}
          {cardCount}
          {" "}
          cards
          <ArrowRight className="size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}

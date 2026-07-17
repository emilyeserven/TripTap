import { RefreshCw, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** The flashcard drill's results screen: score, known/review counts, and the restart options. */
export function PracticeDoneCard({
  knownCount,
  reviewCount,
  deckSize,
  onReviewMissed,
  onRestart,
  onChangeSettings,
}: {
  knownCount: number;
  reviewCount: number;
  deckSize: number;
  onReviewMissed: () => void;
  onRestart: () => void;
  onChangeSettings: () => void;
}) {
  const pct = deckSize ? Math.round((knownCount / deckSize) * 100) : 0;
  return (
    <Card>
      <CardContent className="space-y-4 py-6 text-center">
        <div className="text-4xl font-bold">{pct}%</div>
        <h2 className="text-lg font-semibold">お疲れさま — Nice work</h2>
        <p className="text-sm">
          <strong>{knownCount}</strong>
          {" known · "}
          <strong>{reviewCount}</strong>
          {" to review"}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {reviewCount > 0 && (
            <Button onClick={onReviewMissed}>
              <RotateCcw className="size-4" />
              {" "}
              Review the
              {" "}
              {reviewCount}
              {" "}
              missed
            </Button>
          )}
          <Button
            variant="outline"
            onClick={onRestart}
          >
            <RefreshCw className="size-4" />
            Restart full deck
          </Button>
          <Button
            variant="ghost"
            onClick={onChangeSettings}
          >Change settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

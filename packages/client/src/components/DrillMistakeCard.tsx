import type { DrillMistake, DrillReasonCategory } from "@sentence-bank/types";

import { AddSentenceFromMistakeDialog } from "@/components/AddSentenceFromMistakeDialog";
import { TatoebaExamplePicker } from "@/components/TatoebaExamplePicker";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { resolveReasonRef } from "@/lib/drill-reasons";

/**
 * One logged mistake in a drill session: the question (when the drill recorded one), the learner's
 * answer, the correct answer, the tagged reasons, and the reflection.
 */
export function DrillMistakeCard({
  mistake,
  categories,
}: {
  mistake: DrillMistake;
  categories: DrillReasonCategory[];
}) {
  return (
    <Card>
      <CardContent className="space-y-2 p-4">
        {mistake.question
          ? <p className="font-medium">{mistake.question}</p>
          : null}
        <p
          className={mistake.question
            ? "text-sm text-muted-foreground"
            : "font-medium"}
        >
          {mistake.question ? "You put: " : null}
          <span className={mistake.question ? "text-foreground" : undefined}>{mistake.prompt}</span>
        </p>
        {mistake.correctAnswer
          ? (
            <p className="text-sm text-muted-foreground">
              Correct:
              {" "}
              <span className="text-foreground">{mistake.correctAnswer}</span>
            </p>
          )
          : null}
        {mistake.reasons.length > 0
          ? (
            <div className="flex flex-wrap gap-1.5">
              {mistake.reasons.map((ref, i) => (
                <Badge
                  key={ref.reasonId ?? `${ref.categoryId}-${i}`}
                  variant="outline"
                >
                  {resolveReasonRef(categories, ref).label}
                </Badge>
              ))}
            </div>
          )
          : null}
        {mistake.reflection
          ? <p className="text-sm whitespace-pre-wrap italic">{mistake.reflection}</p>
          : null}
        <TatoebaExamplePicker defaultQuery={mistake.correctAnswer ?? mistake.prompt} />
        <div className="pt-1">
          <AddSentenceFromMistakeDialog mistake={mistake} />
        </div>
      </CardContent>
    </Card>
  );
}

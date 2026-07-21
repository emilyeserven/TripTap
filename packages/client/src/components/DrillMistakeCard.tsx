import type { DrillMistake, DrillReasonCategory } from "@sentence-bank/types";

import { TriangleAlert } from "lucide-react";

import { AddSentenceFromMistakeDialog } from "@/components/AddSentenceFromMistakeDialog";
import { RenshuuExamplePicker } from "@/components/RenshuuExamplePicker";
import { TatoebaExamplePicker } from "@/components/TatoebaExamplePicker";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRecurringDrillQuestions } from "@/hooks/useRecurringDrillQuestions";
import { resolveReasonRef } from "@/lib/drill-reasons";
import { normalizeQuestion, RECURRENCE_MIN_SESSIONS } from "@/lib/drill-recurring";

/**
 * One logged mistake in a drill session: the question (when the drill recorded one), the learner's
 * answer, the correct answer, the tagged reasons, and the reflection. When the same question has come
 * up across several recent sessions, a warning nudges the learner to practise it (the Find-examples
 * lookup and "Add sentence" action below are already the way to act on it).
 */
export function DrillMistakeCard({
  mistake,
  categories,
}: {
  mistake: DrillMistake;
  categories: DrillReasonCategory[];
}) {
  const exampleQuery = mistake.question ?? mistake.correctAnswer ?? mistake.prompt;
  const recurring = useRecurringDrillQuestions();
  const key = normalizeQuestion(mistake.question);
  const recurrence = key ? recurring.get(key) : undefined;
  const isRecurring = (recurrence?.sessionCount ?? 0) >= RECURRENCE_MIN_SESSIONS;
  return (
    <Card className={isRecurring ? "border-amber-500/60" : undefined}>
      <CardContent className="space-y-2 p-4">
        {mistake.question
          ? <p className="font-medium">{mistake.question}</p>
          : null}
        {isRecurring && recurrence
          ? (
            <p
              className="
                flex items-start gap-1.5 text-sm font-medium text-amber-600
                dark:text-amber-500
              "
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              <span>
                You&apos;ve missed this in {recurrence.sessionCount} drills this week — try using it in
                a sentence or looking up its collocations below.
              </span>
            </p>
          )
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
        <Tabs defaultValue="tatoeba">
          <TabsList>
            <TabsTrigger value="tatoeba">Tatoeba</TabsTrigger>
            <TabsTrigger value="renshuu">Renshuu</TabsTrigger>
          </TabsList>
          <TabsContent value="tatoeba">
            <TatoebaExamplePicker defaultQuery={exampleQuery} />
          </TabsContent>
          <TabsContent value="renshuu">
            <RenshuuExamplePicker defaultQuery={exampleQuery} />
          </TabsContent>
        </Tabs>
        <div className="pt-1">
          <AddSentenceFromMistakeDialog mistake={mistake} />
        </div>
      </CardContent>
    </Card>
  );
}

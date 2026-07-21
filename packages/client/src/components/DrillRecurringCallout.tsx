import type { RecurringQuestion } from "@/lib/drill-recurring";

import { Search, TriangleAlert } from "lucide-react";

import { AddSentenceFromMistakeDialog } from "@/components/AddSentenceFromMistakeDialog";
import { RenshuuExamplePicker } from "@/components/RenshuuExamplePicker";
import { TatoebaExamplePicker } from "@/components/TatoebaExamplePicker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * "Recurring this week" callout for the Drill Stats page: the questions the learner has missed across
 * several recent sessions, each with the two ways to act on it — write a My Sentence using it, or look
 * up real examples/collocations (Tatoeba/Renshuu). Renders nothing when there's nothing recurring.
 */
export function DrillRecurringCallout({
  items,
}: {
  items: RecurringQuestion[];
}) {
  if (items.length === 0) return null;
  return (
    <Card className="border-amber-500/60">
      <CardHeader>
        <CardTitle
          className="
            flex items-center gap-2 text-base text-amber-600
            dark:text-amber-500
          "
        >
          <TriangleAlert className="size-4" />
          Recurring this week
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          You keep missing these. Practise each one — write a sentence using it, or look up how it&apos;s
          really used.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map(item => (
          <div
            key={item.key}
            className="
              flex flex-wrap items-center justify-between gap-2 rounded-md
              border p-3
            "
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate font-medium">{item.question}</span>
              <Badge variant="secondary">{item.sessionCount} drills</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                  >
                    <Search className="size-4" />
                    Find examples
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="w-96"
                >
                  <Tabs defaultValue="tatoeba">
                    <TabsList>
                      <TabsTrigger value="tatoeba">Tatoeba</TabsTrigger>
                      <TabsTrigger value="renshuu">Renshuu</TabsTrigger>
                    </TabsList>
                    <TabsContent value="tatoeba">
                      <TatoebaExamplePicker defaultQuery={item.question} />
                    </TabsContent>
                    <TabsContent value="renshuu">
                      <RenshuuExamplePicker defaultQuery={item.question} />
                    </TabsContent>
                  </Tabs>
                </PopoverContent>
              </Popover>
              <AddSentenceFromMistakeDialog mistake={item.sample} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

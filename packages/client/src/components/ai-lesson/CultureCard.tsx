import type { AiLessonRef } from "./AiLessonBadge";
import type { CultureItem } from "@sentence-bank/types";

import { AiLessonBadge } from "./AiLessonBadge";
import { AiLessonIcon } from "./icon-map";
import { VocabPill } from "./VocabPill";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** A single culture-context card. */
export function CultureCard({
  culture: c, aiLesson,
}: { culture: CultureItem;
  aiLesson?: AiLessonRef; }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <span
            className="
              flex size-9 shrink-0 items-center justify-center rounded-md
              bg-muted
            "
          >
            <AiLessonIcon
              name={c.icon}
              className="size-4"
            />
          </span>
          <div className="min-w-0">
            <CardTitle className="text-base">{c.jp}</CardTitle>
            <div className="text-sm text-muted-foreground">{c.en}</div>
          </div>
          {aiLesson
            ? (
              <div className="ml-auto">
                <AiLessonBadge {...aiLesson} />
              </div>
            )
            : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm/relaxed">{c.body}</p>
        {c.terms.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {c.terms.map(t => (
              <VocabPill
                key={t}
                term={t}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

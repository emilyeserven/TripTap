import type { ComplexityScale, DailyLineup, LineupItem } from "@sentence-bank/types";
import type * as React from "react";

import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, ListChecksIcon, X } from "lucide-react";

import { LearningAreaBadges } from "@/components/LearningAreaBadges";
import { LineupExclusionsEditor } from "@/components/LineupExclusionsEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { moveItem, removeItem, toggleItemDone } from "@/lib/daily-lineup";

/** Route a lineup item's snapshotted link data into a typed `Link` (same cast as suggestions). */
function itemLinkProps(item: LineupItem): React.ComponentProps<typeof Link> {
  return {
    to: item.to,
    params: item.params,
    search: item.search,
  } as unknown as React.ComponentProps<typeof Link>;
}

/**
 * Today's locked-in practice sequence: ordered rows with done-checkoffs, reordering, and removal,
 * plus the "build for today" exclusions. The parent owns persistence — every change hands back the
 * full lineup document.
 */
export function DailyLineupCard({
  lineup,
  mediaTypeOptions,
  complexityScale,
  onChange,
}: {
  lineup: DailyLineup;
  mediaTypeOptions: string[];
  complexityScale: ComplexityScale | null;
  onChange: (next: DailyLineup) => void;
}) {
  const doneCount = lineup.items.filter(item => item.done).length;
  return (
    <Card>
      <CardHeader>
        <CardTitle
          className="flex items-center justify-between gap-2 text-base"
        >
          <span className="flex items-center gap-2">
            <ListChecksIcon className="size-4" />
            Today&apos;s lineup
          </span>
          {lineup.items.length > 0 && (
            <span
              className="text-sm font-normal text-muted-foreground tabular-nums"
            >
              {doneCount}/{lineup.items.length} done
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {lineup.items.length === 0
          ? (
            <p className="text-sm text-muted-foreground">
              Nothing locked in yet — add suggestions below to build today&apos;s sequence.
            </p>
          )
          : (
            <ol className="space-y-2">
              {lineup.items.map((item, index) => (
                <li
                  key={item.id}
                  className="
                    flex items-center gap-2 rounded-md border p-2 text-sm
                  "
                >
                  <Checkbox
                    checked={item.done}
                    aria-label={item.done ? `Mark "${item.title}" not done` : `Mark "${item.title}" done`}
                    onCheckedChange={() => onChange({
                      ...lineup,
                      items: toggleItemDone(lineup.items, item.id),
                    })}
                  />
                  <Link
                    {...itemLinkProps(item)}
                    className={`
                      flex-1 font-medium
                      hover:underline
                      ${item.done ? "text-muted-foreground line-through" : ""}
                    `}
                  >
                    {item.title}
                  </Link>
                  {item.area && <LearningAreaBadges areas={[item.area]} />}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label={`Move "${item.title}" up`}
                    disabled={index === 0}
                    onClick={() => onChange({
                      ...lineup,
                      items: moveItem(lineup.items, index, -1),
                    })}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label={`Move "${item.title}" down`}
                    disabled={index === lineup.items.length - 1}
                    onClick={() => onChange({
                      ...lineup,
                      items: moveItem(lineup.items, index, 1),
                    })}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label={`Remove "${item.title}" from the lineup`}
                    onClick={() => onChange({
                      ...lineup,
                      items: removeItem(lineup.items, item.id),
                    })}
                  >
                    <X className="size-4" />
                  </Button>
                </li>
              ))}
            </ol>
          )}

        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
            >
              Build for today…
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <LineupExclusionsEditor
              exclusions={lineup.exclusions}
              mediaTypeOptions={mediaTypeOptions}
              complexityScale={complexityScale}
              onChange={exclusions => onChange({
                ...lineup,
                exclusions,
              })}
            />
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

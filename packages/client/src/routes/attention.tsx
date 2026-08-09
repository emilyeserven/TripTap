import type { AttentionItem, AttentionKind } from "@/lib/attention";
import type { LucideIcon } from "lucide-react";
import type * as React from "react";

import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpenIcon,
  CalendarClockIcon,
  CheckSquareIcon,
  GroupIcon,
  LayersIcon,
  PenLineIcon,
  RotateCcwIcon,
  TriangleAlertIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAttention } from "@/hooks/useAttention";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/attention")({
  component: AttentionPage,
});

const ATTENTION_KIND_ICONS: Record<AttentionKind, LucideIcon> = {
  "sheet-due": CalendarClockIcon,
  "sentence-correction": PenLineIcon,
  "ungraded-sheet": CheckSquareIcon,
  "word-note-sentence": BookOpenIcon,
  "flashcard-pending": LayersIcon,
  "recurring-drill": TriangleAlertIcon,
  "rule-group-ready": GroupIcon,
  "rewrite-ready": RotateCcwIcon,
};

/** Route an item's or group's untyped link data into a typed `Link` (the Start-suggestions idiom). */
function itemLinkProps(item: Partial<Pick<AttentionItem, "to" | "params" | "search">>): React.ComponentProps<typeof Link> {
  return {
    to: item.to,
    params: item.params,
    search: item.search,
  } as unknown as React.ComponentProps<typeof Link>;
}

function AttentionPage() {
  usePageTitle("Needs attention");
  const {
    groups, isLoading,
  } = useAttention();

  return (
    <section className="max-w-3xl space-y-6">
      <p className="text-sm text-muted-foreground">
        Everything you flagged for later, in one place: sentences awaiting correction, sheets to
        grade, words to bank, flashcards to make, and mistakes that keep coming back. Acting on an
        item clears it.
      </p>

      {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
      {!isLoading && groups.length === 0
        ? <p className="text-muted-foreground">Nothing needs your attention. Nice work!</p>
        : null}

      {groups.map((group) => {
        const Icon = ATTENTION_KIND_ICONS[group.kind];
        return (
          <Card key={group.kind}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon className="size-4" />
                {group.label}
                <Badge variant="secondary">{group.count}</Badge>
                {group.to && (
                  <Link
                    {...itemLinkProps(group)}
                    className="
                      ml-auto text-sm font-normal text-primary
                      hover:underline
                    "
                  >
                    See all
                  </Link>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {group.items.map(item => (
                <Link
                  key={item.id}
                  {...itemLinkProps(item)}
                  className="
                    flex items-center justify-between gap-2 rounded-md border
                    p-2 text-sm transition-colors
                    hover:bg-accent
                  "
                >
                  <span className="min-w-0 truncate font-medium">{item.title}</span>
                  {item.detail && (
                    <Badge variant={item.destructive ? "destructive" : "outline"}>
                      {item.detail}
                    </Badge>
                  )}
                </Link>
              ))}
              {group.count > group.items.length && (
                <p className="text-xs text-muted-foreground">
                  …and {group.count - group.items.length} more.
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}

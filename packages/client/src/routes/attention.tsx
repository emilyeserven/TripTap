import type { AttentionItem, AttentionKind } from "@/lib/attention";
import type { LucideIcon } from "lucide-react";
import type * as React from "react";

import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpenIcon,
  CalendarClockIcon,
  CheckSquareIcon,
  EyeIcon,
  EyeOffIcon,
  GroupIcon,
  LayersIcon,
  PenLineIcon,
  RotateCcwIcon,
  TriangleAlertIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAttention } from "@/hooks/useAttention";
import { usePageTitle } from "@/hooks/usePageTitle";
import { ATTENTION_KIND_LABELS } from "@/lib/attention";

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
    groups,
    isLoading,
    hidden,
    hideItem,
    unhideItem,
    hideKind,
    unhideKind,
    unhideAll,
    isUpdatingHidden,
  } = useAttention();

  const hasHidden = hidden.hiddenKinds.length > 0 || hidden.hiddenItems.length > 0;

  return (
    <section className="max-w-3xl space-y-6">
      <p className="text-sm text-muted-foreground">
        Everything you flagged for later, in one place: sentences awaiting correction, sheets to
        grade, words to bank, flashcards to make, and mistakes that keep coming back. Acting on an
        item clears it — or hide the ones you are never coming back to.
      </p>

      {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
      {!isLoading && groups.length === 0
        ? (
          <p className="text-muted-foreground">
            {hasHidden
              ? "Nothing needs your attention (everything else is hidden). Nice work!"
              : "Nothing needs your attention. Nice work!"}
          </p>
        )
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
                <span className="ml-auto flex items-center gap-3">
                  {group.to && (
                    <Link
                      {...itemLinkProps(group)}
                      className="
                        text-sm font-normal text-primary
                        hover:underline
                      "
                    >
                      See all
                    </Link>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isUpdatingHidden}
                    onClick={() => hideKind(group.kind)}
                    title={`Hide "${group.label}" from the inbox`}
                  >
                    <EyeOffIcon className="size-4" />
                    Hide group
                  </Button>
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {group.items.map(item => (
                <div
                  key={item.id}
                  className="
                    flex items-center gap-1 rounded-md border pr-1
                    transition-colors
                    hover:bg-accent
                  "
                >
                  <Link
                    {...itemLinkProps(item)}
                    className="
                      flex min-w-0 flex-1 items-center justify-between gap-2 p-2
                      text-sm
                    "
                  >
                    <span className="min-w-0 truncate font-medium">{item.title}</span>
                    {item.detail && (
                      <Badge variant={item.destructive ? "destructive" : "outline"}>
                        {item.detail}
                      </Badge>
                    )}
                  </Link>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground"
                    disabled={isUpdatingHidden}
                    onClick={() => hideItem(item)}
                    aria-label={`Hide "${item.title}"`}
                    title="Hide this item"
                  >
                    <EyeOffIcon className="size-4" />
                  </Button>
                </div>
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

      {hasHidden && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <EyeIcon className="size-4" />
              Hidden
              <Badge variant="secondary">
                {hidden.hiddenKinds.length + hidden.hiddenItems.length}
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-auto"
                disabled={isUpdatingHidden}
                onClick={unhideAll}
              >
                Show all again
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Hidden entries never appear in the inbox or on the homepage card, even when the
              underlying item changes.
            </p>
            {hidden.hiddenKinds.map(kind => (
              <HiddenRow
                key={`kind:${kind}`}
                label={ATTENTION_KIND_LABELS[kind]}
                note="whole group"
                disabled={isUpdatingHidden}
                onShow={() => unhideKind(kind)}
              />
            ))}
            {hidden.hiddenItems.map(entry => (
              <HiddenRow
                key={`${entry.kind}:${entry.id}`}
                label={entry.title ?? entry.id}
                note={ATTENTION_KIND_LABELS[entry.kind]}
                disabled={isUpdatingHidden}
                onShow={() => unhideItem(entry)}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </section>
  );
}

/** One row of the Hidden list: what was hidden, where it came from, and a way back. */
function HiddenRow({
  label, note, disabled, onShow,
}: {
  label: string;
  note: string;
  disabled: boolean;
  onShow: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border p-2 text-sm">
      <span className="min-w-0 flex-1 truncate text-muted-foreground">{label}</span>
      <Badge variant="outline">{note}</Badge>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={onShow}
        aria-label={`Show "${label}" again`}
      >
        <EyeIcon className="size-4" />
        Show
      </Button>
    </div>
  );
}

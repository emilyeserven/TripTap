import type {
  BookmarkResource,
  BookmarkSectionMatch,
  BookmarkSectionRef,
  ComplexityScale,
  DailyLineup,
  LearningArea,
  LineupItem,
} from "@sentence-bank/types";
import type * as React from "react";

import { useState } from "react";

import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, ListChecksIcon, Pencil, Plus, X } from "lucide-react";

import { BookmarkPicker } from "@/components/BookmarkPicker";
import { LearningAreaBadges } from "@/components/LearningAreaBadges";
import { LearningAreaSelect } from "@/components/LearningAreaSelect";
import { LineupExclusionsEditor } from "@/components/LineupExclusionsEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { customLineupItem, moveItem, removeItem, renameItem, toggleItemDone } from "@/lib/daily-lineup";
import { retargetLineupItem, sessionLinkFor, sessionSearch } from "@/lib/start-recommendations";

/** Route a lineup item's snapshotted link data into a typed `Link` (same cast as suggestions). */
function itemLinkProps(item: LineupItem): React.ComponentProps<typeof Link> {
  return {
    to: item.to,
    params: item.params,
    search: item.search,
  } as unknown as React.ComponentProps<typeof Link>;
}

/** Combobox sentinel for "no section" — the empty string is the combobox's own placeholder value. */
const WHOLE_RESOURCE = "__whole__";

/**
 * The per-item edit popover: rename any item, and — for items built from a resource — change which
 * resource it points at or which of that resource's sections. Rebuilds via {@link retargetLineupItem}
 * so the title/link/id stay consistent with what the ranker would have produced.
 */
function LineupItemEditor({
  item,
  resources,
  sectionsByResource,
  onRename,
  onRetarget,
}: {
  item: LineupItem;
  resources: BookmarkResource[];
  sectionsByResource: Record<string, BookmarkSectionMatch[]>;
  onRename: (title: string) => void;
  onRetarget: (resource: BookmarkResource, section: BookmarkSectionMatch["section"] | null) => void;
}) {
  const [title, setTitle] = useState(item.title);
  const resource = item.resourceId ? resources.find(r => r.id === item.resourceId) : undefined;
  const sections = resource ? sectionsByResource[resource.id] ?? [] : [];

  const commitTitle = () => {
    if (title.trim() && title.trim() !== item.title) onRename(title);
  };

  return (
    <Popover
      onOpenChange={open => open && setTitle(item.title)}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          aria-label={`Edit "${item.title}"`}
        >
          <Pencil className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 space-y-3"
      >
        <div className="space-y-1.5">
          <Label htmlFor={`rename-${item.id}`}>Name</Label>
          <Input
            id={`rename-${item.id}`}
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitTitle();
              }
            }}
          />
        </div>

        {resource && (
          <>
            <div className="space-y-1.5">
              <Label>Resource</Label>
              <Combobox
                value={resource.id}
                onChange={(id) => {
                  const next = resources.find(r => r.id === id);
                  if (next && next.id !== resource.id) onRetarget(next, null);
                }}
                options={resources.map(r => ({
                  value: r.id,
                  label: r.title,
                }))}
                ariaLabel="Change resource"
                searchPlaceholder="Search resources…"
                className="w-full"
              />
            </div>
            {sections.length > 0 && (
              <div className="space-y-1.5">
                <Label>Section</Label>
                <Combobox
                  value={item.sectionId ?? WHOLE_RESOURCE}
                  onChange={(id) => {
                    if (id === WHOLE_RESOURCE) {
                      onRetarget(resource, null);
                      return;
                    }
                    const match = sections.find(s => s.section.id === id);
                    if (match) onRetarget(resource, match.section);
                  }}
                  options={[
                    {
                      value: WHOLE_RESOURCE,
                      label: "Whole resource (no section)",
                    },
                    ...sections.map(s => ({
                      value: s.section.id,
                      label: s.section.label,
                    })),
                  ]}
                  ariaLabel="Change section"
                  searchPlaceholder="Search sections…"
                  className="w-full"
                />
              </div>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

/**
 * "Add a custom item" popover — a learner hand-builds a lineup entry. The chosen learning area sets
 * the link target (via {@link sessionLinkFor}); an optional resource/section fills the link's search
 * params and auto-suggests the title (still overridable). Emits a finished {@link LineupItem}.
 */
function AddCustomItem({
  onAdd,
}: {
  onAdd: (item: LineupItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [area, setArea] = useState<LearningArea | null>(null);
  const [bookmarkId, setBookmarkId] = useState<string | null>(null);
  const [bookmarkTitle, setBookmarkTitle] = useState<string | null>(null);
  const [bookmarkUrl, setBookmarkUrl] = useState<string | null>(null);
  const [section, setSection] = useState<BookmarkSectionRef | null>(null);

  const reset = () => {
    setTitle("");
    setDescription("");
    setArea(null);
    setBookmarkId(null);
    setBookmarkTitle(null);
    setBookmarkUrl(null);
    setSection(null);
  };

  const {
    to, verb,
  } = sessionLinkFor(area);
  // A resource (and section) suggests a title; a typed title always wins.
  const suggestedTitle = bookmarkTitle
    ? section
      ? `${verb} "${section.label}" of ${bookmarkTitle}`
      : `${verb} a bit of ${bookmarkTitle}`
    : "";
  const effectiveTitle = title.trim() || suggestedTitle;
  const canSubmit = effectiveTitle.length > 0;

  const submit = () => {
    if (!canSubmit) return;
    onAdd(customLineupItem({
      title: effectiveTitle,
      description: description.trim() || null,
      area,
      to,
      search: bookmarkId
        ? sessionSearch(to, bookmarkId, bookmarkTitle ?? "", bookmarkUrl)
        : undefined,
      resourceId: bookmarkId ?? undefined,
      sectionId: section?.id,
    }));
    reset();
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
        >
          <Plus className="size-4" />
          Add a custom item
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-80 space-y-3"
      >
        <div className="space-y-1.5">
          <Label htmlFor="custom-item-title">Title</Label>
          <Input
            id="custom-item-title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={suggestedTitle || "e.g. Review yesterday's mistakes"}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="custom-item-description">Description (optional)</Label>
          <Textarea
            id="custom-item-description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Learning area (optional)</Label>
          <p className="text-xs text-muted-foreground">Sets where the item links.</p>
          <LearningAreaSelect
            value={area}
            onChange={setArea}
          />
        </div>
        <BookmarkPicker
          selectedBookmarkId={bookmarkId}
          selectedBookmarkTitle={bookmarkTitle}
          label="Resource (optional)"
          onPick={(record) => {
            setBookmarkId(record?.id ?? null);
            setBookmarkTitle(record?.title ?? null);
            setBookmarkUrl(record?.url ?? null);
            setSection(null);
          }}
          enableSections
          selectedSection={section}
          onPickSection={setSection}
        />
        <Button
          type="button"
          size="sm"
          className="w-full"
          disabled={!canSubmit}
          onClick={submit}
        >
          Add to lineup
        </Button>
      </PopoverContent>
    </Popover>
  );
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
  resources,
  sectionsByResource,
  onChange,
}: {
  lineup: DailyLineup;
  mediaTypeOptions: string[];
  complexityScale: ComplexityScale | null;
  /** Every resource, for the per-item "change resource" picker. */
  resources: BookmarkResource[];
  /** Each resource's sections (by bookmark id), for the per-item "swap section" picker. */
  sectionsByResource: Record<string, BookmarkSectionMatch[]>;
  onChange: (next: DailyLineup) => void;
}) {
  const doneCount = lineup.items.filter(item => item.done).length;

  /** Replace `item` with a retargeted version, dropping any pre-existing duplicate so ids stay unique. */
  const retarget = (
    item: LineupItem,
    resource: BookmarkResource,
    section: BookmarkSectionMatch["section"] | null,
  ) => {
    const next = retargetLineupItem(item, resource, section);
    const seen = new Set<string>();
    const items = lineup.items
      .map(i => (i.id === item.id ? next : i))
      .filter(i => (seen.has(i.id) ? false : (seen.add(i.id), true)));
    onChange({
      ...lineup,
      items,
    });
  };
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
                  <LineupItemEditor
                    item={item}
                    resources={resources}
                    sectionsByResource={sectionsByResource}
                    onRename={title => onChange({
                      ...lineup,
                      items: renameItem(lineup.items, item.id, title),
                    })}
                    onRetarget={(resource, section) => retarget(item, resource, section)}
                  />
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

        <AddCustomItem
          onAdd={item => onChange({
            ...lineup,
            items: [...lineup.items, item],
          })}
        />

        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
            >
              Filter today&apos;s suggestions…
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

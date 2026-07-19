import type { ResourceSort } from "@/lib/collections";

import { useMemo, useState } from "react";

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BookOpen, ExternalLink, Headphones, ImageOff, PenLine, RefreshCw, Repeat2, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBookmarkResources, useRefreshBookmarks } from "@/hooks/useBookmarks";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useBookmarksSettings } from "@/hooks/useSettings";
import { useCreateWriting } from "@/hooks/useWritings";
import {
  ALL_FILTER,
  COMPLEXITY_MIN,
  complexityLevelOptions,
  formatComplexity,
  formatRuntime,
  drillTagFilterOptions,
  learningAreaFilterOptions,
  matchesComplexity,
  matchesDrillTags,
  matchesLearningAreas,
  matchesMaterialTypes,
  matchesMediaType,
  matchesWebsite,
  materialTypeFilterOptions,
  mediaTypeFilterOptions,
  resourceActions,
  resourceDrillTags,
  resourceLearningAreas,
  resourceMaterialTypes,
  sortResources,
  websiteFilterOptions,
} from "@/lib/collections";

export const Route = createFileRoute("/collections/")({
  component: CollectionsPage,
});

function CollectionsPage() {
  usePageTitle("Resources");
  const {
    data, isLoading, isFetching, error,
  } = useBookmarkResources();
  const settings = useBookmarksSettings();
  const refreshBookmarks = useRefreshBookmarks();
  const navigate = useNavigate();
  const createWriting = useCreateWriting();

  const [search, setSearch] = useState("");
  const [website, setWebsite] = useState(ALL_FILTER);
  const [mediaType, setMediaType] = useState(ALL_FILTER);
  const [areas, setAreas] = useState<string[]>([]);
  const [materials, setMaterials] = useState<string[]>([]);
  const [drills, setDrills] = useState<string[]>([]);
  const [sort, setSort] = useState<ResourceSort>("runtime-desc");
  const [complexityMin, setComplexityMin] = useState(COMPLEXITY_MIN);
  const [complexityMax, setComplexityMax] = useState<number | null>(null);

  const all = useMemo(() => data?.resources ?? [], [data]);
  const scale = data?.complexityScale ?? null;
  const areaTags = useMemo(() => settings.data?.learningAreaTags ?? {}, [settings.data]);
  const materialTags = useMemo(() => settings.data?.materialTypeTags ?? {}, [settings.data]);
  const drillTags = useMemo(() => settings.data?.drillTags ?? {}, [settings.data]);
  const websiteOptions = useMemo(() => websiteFilterOptions(all), [all]);
  const mediaTypeOptions = useMemo(() => mediaTypeFilterOptions(all), [all]);
  const areaOptions = useMemo(() => learningAreaFilterOptions(areaTags, all), [areaTags, all]);
  const materialOptions = useMemo(() => materialTypeFilterOptions(materialTags, all), [materialTags, all]);
  const drillOptions = useMemo(() => drillTagFilterOptions(drillTags, all), [drillTags, all]);
  const levelOptions = useMemo(() => (scale ? complexityLevelOptions(scale) : []), [scale]);
  // Default the upper complexity bound to the top of the scale until the user narrows it.
  const selMax = complexityMax ?? scale?.max ?? COMPLEXITY_MIN;

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = all.filter(r =>
      (!q || r.title.toLowerCase().includes(q))
      && matchesWebsite(r, website)
      && matchesMediaType(r, mediaType)
      && matchesLearningAreas(r, areas, areaTags)
      && matchesMaterialTypes(r, materials, materialTags)
      && matchesDrillTags(r, drills, drillTags)
      && matchesComplexity(r, complexityMin, selMax, scale));
    return sortResources(filtered, sort);
  }, [
    all,
    search,
    website,
    mediaType,
    areas,
    areaTags,
    materials,
    materialTags,
    drills,
    drillTags,
    complexityMin,
    selMax,
    scale,
    sort,
  ]);

  const nothing = !isLoading && !error && shown.length === 0;

  const startWriting = (title: string) => {
    createWriting.mutate(
      {
        text: "",
        language: "Japanese",
        readyToReview: false,
        promptTitle: title,
        promptText: null,
      },
      {
        onSuccess: writing =>
          navigate({
            to: "/my-writing/$id",
            params: {
              id: writing.id,
            },
          }),
      },
    );
  };

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Resources</h1>
          <p className="text-sm text-muted-foreground">
            Browse everything in your Resources source and start a session from any item — the buttons
            follow each item’s learning areas (or its media type when none are mapped).
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => void refreshBookmarks()}
          disabled={isFetching}
          aria-label="Refresh from the bookmarks app"
        >
          <RefreshCw className={isFetching ? "size-4 animate-spin" : "size-4"} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by title…"
          className="w-64"
          aria-label="Search collections"
        />
        {mediaTypeOptions.length > 1
          ? (
            <Combobox
              value={mediaType}
              onChange={setMediaType}
              options={mediaTypeOptions}
              ariaLabel="Filter by media type"
              searchPlaceholder="Search media types…"
              className="w-48"
            />
          )
          : null}
        {websiteOptions.length > 1
          ? (
            <Combobox
              value={website}
              onChange={setWebsite}
              options={websiteOptions}
              ariaLabel="Filter by website"
              searchPlaceholder="Search websites…"
              className="w-52"
            />
          )
          : null}
        {areaOptions.length > 0
          ? (
            <MultiSelect
              value={areas}
              onChange={setAreas}
              options={areaOptions}
              ariaLabel="Filter by learning area"
              placeholder="All learning areas"
              searchPlaceholder="Search learning areas…"
              className="w-56"
            />
          )
          : null}
        {materialOptions.length > 0
          ? (
            <MultiSelect
              value={materials}
              onChange={setMaterials}
              options={materialOptions}
              ariaLabel="Filter by material type"
              placeholder="All material types"
              searchPlaceholder="Search material types…"
              className="w-52"
            />
          )
          : null}
        {drillOptions.length > 0
          ? (
            <MultiSelect
              value={drills}
              onChange={setDrills}
              options={drillOptions}
              ariaLabel="Filter by drill tag"
              placeholder="All drill tags"
              searchPlaceholder="Search drill tags…"
              className="w-48"
            />
          )
          : null}
        <Select
          value={sort}
          onValueChange={v => setSort(v as ResourceSort)}
        >
          <SelectTrigger
            className="w-48"
            aria-label="Sort"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="runtime-desc">Longest first</SelectItem>
            <SelectItem value="runtime-asc">Shortest first</SelectItem>
            <SelectItem value="progress-desc">Most progress</SelectItem>
            <SelectItem value="progress-asc">Least progress</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {scale
        ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Complexity</span>
            <Select
              value={String(complexityMin)}
              onValueChange={v => setComplexityMin(Number(v))}
            >
              <SelectTrigger
                className="w-52"
                aria-label="Minimum complexity"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {levelOptions.map(o => (
                  <SelectItem
                    key={o.value}
                    value={String(o.value)}
                  >
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">to</span>
            <Select
              value={String(selMax)}
              onValueChange={v => setComplexityMax(Number(v))}
            >
              <SelectTrigger
                className="w-52"
                aria-label="Maximum complexity"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {levelOptions.map(o => (
                  <SelectItem
                    key={o.value}
                    value={String(o.value)}
                  >
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )
        : null}

      {error ? <p className="text-sm text-destructive">{error.message}</p> : null}
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {nothing
        ? (
          <p className="text-sm text-muted-foreground">
            No items found. Set a Collections source on the Settings page to populate this list, or loosen
            your filters.
          </p>
        )
        : null}

      <div
        className="
          grid gap-4
          sm:grid-cols-2
          lg:grid-cols-3
        "
      >
        {shown.map((r) => {
          const complexityLabel = formatComplexity(r, scale);
          const cardAreas = resourceLearningAreas(r.tagIds, areaTags);
          const cardMaterials = resourceMaterialTypes(r.tagIds, materialTags);
          const cardDrills = resourceDrillTags(r.tagIds, drillTags);
          const actions = resourceActions(r, areaTags);
          return (
            <Card
              key={r.id}
              className="flex flex-col gap-0 overflow-hidden py-0"
            >
              <div className="aspect-video w-full overflow-hidden bg-muted">
                {r.imageUrl
                  ? (
                    <img
                      src={r.imageUrl}
                      alt=""
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  )
                  : (
                    <div className="flex size-full items-center justify-center">
                      <ImageOff className="size-8 text-muted-foreground" />
                    </div>
                  )}
              </div>
              <CardContent className="flex-1 space-y-2 p-4">
                <div className="flex items-center gap-1">
                  {r.favorite
                    ? (
                      <Star
                        className="
                          size-3.5 shrink-0 fill-yellow-400 text-yellow-400
                        "
                        aria-label="Favorited"
                      />
                    )
                    : null}
                  {r.url
                    ? (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className="
                          flex min-w-0 items-center gap-1 font-medium
                          hover:underline
                        "
                      >
                        <span className="truncate">{r.title}</span>
                        <ExternalLink
                          className="size-3.5 shrink-0 text-muted-foreground"
                        />
                      </a>
                    )
                    : <span className="min-w-0 truncate font-medium">{r.title}</span>}
                </div>
                <div
                  className="
                    flex flex-wrap items-center gap-2 text-xs
                    text-muted-foreground
                  "
                >
                  {r.website ? <Badge variant="secondary">{r.website.siteName}</Badge> : null}
                  {r.mediaType ? <Badge variant="outline">{r.mediaType}</Badge> : null}
                  {complexityLabel ? <Badge variant="outline">{complexityLabel}</Badge> : null}
                  {cardAreas.map(area => (
                    <Badge
                      key={area}
                      variant="secondary"
                    >{area}
                    </Badge>
                  ))}
                  {cardMaterials.map(type => (
                    <Badge
                      key={type}
                      variant="default"
                    >{type}
                    </Badge>
                  ))}
                  {cardDrills.map(tag => (
                    <Badge
                      key={tag}
                      variant="outline"
                    >{tag}
                    </Badge>
                  ))}
                  {r.runtimeSeconds != null
                    ? <span className="font-mono">{formatRuntime(r.runtimeSeconds)}</span>
                    : null}
                </div>
                {r.progress
                  ? (
                    <div className="space-y-1">
                      <Progress
                        value={Math.round(r.progress.percent * 100)}
                        className="h-1.5"
                      />
                      <p className="text-xs text-muted-foreground">{r.progress.label}</p>
                    </div>
                  )
                  : null}
              </CardContent>
              <CardFooter className="flex-wrap gap-2 p-4 pt-0">
                {actions.includes("listening")
                  ? (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Link
                        to="/listening-sessions/new"
                        search={{
                          bookmarkId: r.id,
                          bookmarkTitle: r.title,
                          bookmarkUrl: r.url ?? undefined,
                        }}
                      >
                        <Headphones className="size-4" />
                        Listening
                      </Link>
                    </Button>
                  )
                  : null}
                {actions.includes("shadowing")
                  ? (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Link
                        to="/shadowing/new"
                        search={{
                          bookmarkId: r.id,
                          bookmarkTitle: r.title,
                          bookmarkUrl: r.url ?? undefined,
                        }}
                      >
                        <Repeat2 className="size-4" />
                        Shadowing
                      </Link>
                    </Button>
                  )
                  : null}
                {actions.includes("reading")
                  ? (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      <Link
                        to="/reading-sessions/new"
                        search={{
                          title: r.title,
                        }}
                      >
                        <BookOpen className="size-4" />
                        Reading
                      </Link>
                    </Button>
                  )
                  : null}
                {actions.includes("writing")
                  ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      disabled={createWriting.isPending}
                      onClick={() => startWriting(r.title)}
                    >
                      <PenLine className="size-4" />
                      Writing
                    </Button>
                  )
                  : null}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

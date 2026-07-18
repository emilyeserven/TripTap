import { useMemo, useState } from "react";

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BookOpen, ExternalLink, Headphones, ImageOff, PenLine, Repeat2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBookmarkResources } from "@/hooks/useBookmarks";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useCreateWriting } from "@/hooks/useWritings";
import {
  ALL_FILTER,
  COMPLEXITY_MIN,
  complexityLevelOptions,
  formatComplexity,
  formatRuntime,
  hasRuntime,
  matchesComplexity,
  matchesMediaType,
  matchesWebsite,
  mediaTypeFilterOptions,
  sortByRuntime,
  websiteFilterOptions,
} from "@/lib/collections";

export const Route = createFileRoute("/collections/")({
  component: CollectionsPage,
});

function CollectionsPage() {
  usePageTitle("Collections");
  const {
    data, isLoading, error,
  } = useBookmarkResources();
  const navigate = useNavigate();
  const createWriting = useCreateWriting();

  const [search, setSearch] = useState("");
  const [website, setWebsite] = useState(ALL_FILTER);
  const [mediaType, setMediaType] = useState(ALL_FILTER);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [complexityMin, setComplexityMin] = useState(COMPLEXITY_MIN);
  const [complexityMax, setComplexityMax] = useState<number | null>(null);

  const all = useMemo(() => data?.resources ?? [], [data]);
  const scale = data?.complexityScale ?? null;
  const websiteOptions = useMemo(() => websiteFilterOptions(all), [all]);
  const mediaTypeOptions = useMemo(() => mediaTypeFilterOptions(all), [all]);
  const levelOptions = useMemo(() => (scale ? complexityLevelOptions(scale) : []), [scale]);
  // Default the upper complexity bound to the top of the scale until the user narrows it.
  const selMax = complexityMax ?? scale?.max ?? COMPLEXITY_MIN;

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = all.filter(r =>
      (!q || r.title.toLowerCase().includes(q))
      && matchesWebsite(r, website)
      && matchesMediaType(r, mediaType)
      && matchesComplexity(r, complexityMin, selMax, scale));
    return sortByRuntime(filtered, sortDir);
  }, [all, search, website, mediaType, complexityMin, selMax, scale, sortDir]);

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
      <div>
        <h1 className="text-2xl font-semibold">Collections</h1>
        <p className="text-sm text-muted-foreground">
          Browse everything in your Collections source and start a session from any item — listening or
          shadowing for audio/video, reading or writing for text.
        </p>
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
        <Select
          value={sortDir}
          onValueChange={v => setSortDir(v as "asc" | "desc")}
        >
          <SelectTrigger
            className="w-44"
            aria-label="Sort by runtime"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">Longest first</SelectItem>
            <SelectItem value="asc">Shortest first</SelectItem>
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
                {r.url
                  ? (
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="
                        flex items-center gap-1 font-medium
                        hover:underline
                      "
                    >
                      <span className="truncate">{r.title}</span>
                      <ExternalLink
                        className="size-3.5 shrink-0 text-muted-foreground"
                      />
                    </a>
                  )
                  : <span className="block truncate font-medium">{r.title}</span>}
                <div
                  className="
                    flex flex-wrap items-center gap-2 text-xs
                    text-muted-foreground
                  "
                >
                  {r.website ? <Badge variant="secondary">{r.website.siteName}</Badge> : null}
                  {r.mediaType ? <Badge variant="outline">{r.mediaType}</Badge> : null}
                  {complexityLabel ? <Badge variant="outline">{complexityLabel}</Badge> : null}
                  {r.runtimeSeconds != null
                    ? <span className="font-mono">{formatRuntime(r.runtimeSeconds)}</span>
                    : null}
                </div>
              </CardContent>
              <CardFooter className="gap-2 p-4 pt-0">
                {hasRuntime(r)
                  ? (
                    <>
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
                    </>
                  )
                  : (
                    <>
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
                    </>
                  )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

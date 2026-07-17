import { useMemo, useState } from "react";

import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLink, Headphones, ImageOff, Repeat2 } from "lucide-react";

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
import {
  ALL_FILTER,
  formatRuntime,
  matchesWebsite,
  sortByRuntime,
  websiteFilterOptions,
} from "@/lib/resources";

export const Route = createFileRoute("/find-resource/")({
  component: FindResourcePage,
});

function FindResourcePage() {
  usePageTitle("Find a Resource");
  const {
    data: resources, isLoading, error,
  } = useBookmarkResources();

  const [search, setSearch] = useState("");
  const [website, setWebsite] = useState(ALL_FILTER);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const all = useMemo(() => resources ?? [], [resources]);
  const websiteOptions = useMemo(() => websiteFilterOptions(all), [all]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = all.filter(r =>
      (!q || r.title.toLowerCase().includes(q)) && matchesWebsite(r, website));
    return sortByRuntime(filtered, sortDir);
  }, [all, search, website, sortDir]);

  const nothing = !isLoading && !error && shown.length === 0;

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Find a Resource</h1>
        <p className="text-sm text-muted-foreground">
          Browse the bookmarks in your Listening source and start a listening or shadowing session from one.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by title…"
          className="w-64"
          aria-label="Search resources"
        />
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

      {error ? <p className="text-sm text-destructive">{error.message}</p> : null}
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
      {nothing
        ? (
          <p className="text-sm text-muted-foreground">
            No bookmarks found. Set a Listening source on the Settings page to populate this list.
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
        {shown.map(r => (
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
                {r.runtimeSeconds != null
                  ? <span className="font-mono">{formatRuntime(r.runtimeSeconds)}</span>
                  : null}
              </div>
            </CardContent>
            <CardFooter className="gap-2 p-4 pt-0">
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
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
}

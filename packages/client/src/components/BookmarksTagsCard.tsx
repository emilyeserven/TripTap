import type { ComboboxOption } from "@/components/ui/combobox";
import type { BookmarksSourceKind } from "@sentence-bank/types";

import { useEffect, useRef, useState } from "react";

import { Check, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBookmarksTags, useBookmarksTaxonomies } from "@/hooks/useBookmarks";
import { useBookmarksSettings, useUpdateBookmarksSettings } from "@/hooks/useSettings";

/**
 * Settings card for the external bookmarks tag/taxonomy integration. The user sets the API endpoint
 * and picks one source — a parent tag (its children become the vocabulary) or a taxonomy (its terms
 * become the vocabulary). Sentences are then tagged with terms drawn from that source. All calls go
 * server-side through the middleware proxy. See {@link ../routes/settings.tsx}.
 */
export function BookmarksTagsCard() {
  const settings = useBookmarksSettings();
  const update = useUpdateBookmarksSettings();
  const tags = useBookmarksTags();
  const taxonomies = useBookmarksTaxonomies();

  const [endpointUrl, setEndpointUrl] = useState("");
  const [kind, setKind] = useState<BookmarksSourceKind>("taxonomy");
  const [sourceId, setSourceId] = useState("");
  const [saved, setSaved] = useState(false);

  // Seed local state from the loaded settings once (later refetches must not clobber edits).
  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current || !settings.data) return;
    hydrated.current = true;
    setEndpointUrl(settings.data.endpointUrl ?? "");
    if (settings.data.source) {
      setKind(settings.data.source.kind);
      setSourceId(settings.data.source.id);
    }
  }, [settings.data]);

  const sourceQuery = kind === "tag" ? tags : taxonomies;
  const options: ComboboxOption[] = (sourceQuery.data ?? []).map(item => ({
    value: item.id,
    label: item.name,
  }));

  function flashSaved() {
    setSaved(true);
    globalThis.setTimeout(() => setSaved(false), 1500);
  }

  async function save() {
    const selected = options.find(o => o.value === sourceId);
    await update.mutateAsync({
      endpointUrl: endpointUrl.trim() || null,
      source: sourceId && selected
        ? {
          kind,
          id: sourceId,
          label: selected.label,
        }
        : null,
    });
    flashSaved();
  }

  const configured = settings.data?.source;
  const configuredLabel = configured
    ? `${configured.kind === "tag" ? "Tag" : "Taxonomy"}: ${configured.label}`
    : "No source selected";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bookmarks tags</CardTitle>
        <CardDescription>
          Borrow a tag/taxonomy vocabulary from your bookmarks app to tag sentences. Pick a parent tag
          (its children become the choices) or a taxonomy (its terms become the choices).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="bookmarks-endpoint">API endpoint</Label>
          <Input
            id="bookmarks-endpoint"
            type="url"
            placeholder="https://host.example.ts.net"
            value={endpointUrl}
            onChange={event => setEndpointUrl(event.target.value)}
            disabled={update.isPending}
          />
          <p className="text-xs text-muted-foreground">
            Base URL of the bookmarks API. Leave blank to use the server default.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label>Vocabulary source</Label>
            <span className="text-xs text-muted-foreground">{configuredLabel}</span>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={kind === "taxonomy" ? "default" : "outline"}
              onClick={() => {
                setKind("taxonomy");
                setSourceId("");
              }}
              disabled={update.isPending}
            >
              Taxonomy
            </Button>
            <Button
              type="button"
              size="sm"
              variant={kind === "tag" ? "default" : "outline"}
              onClick={() => {
                setKind("tag");
                setSourceId("");
              }}
              disabled={update.isPending}
            >
              Parent tag
            </Button>
          </div>
          {sourceQuery.isError
            ? (
              <p className="text-sm text-destructive">
                Couldn’t reach the bookmarks host. Check the endpoint and that this server is on the
                Tailnet.
              </p>
            )
            : (
              <Combobox
                value={sourceId}
                onChange={setSourceId}
                options={options}
                className="w-full"
                ariaLabel={kind === "tag" ? "Parent tag" : "Taxonomy"}
                placeholder={sourceQuery.isLoading
                  ? "Loading…"
                  : kind === "tag"
                    ? "Select a parent tag…"
                    : "Select a taxonomy…"}
              />
            )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={() => void save()}
            disabled={update.isPending}
          >
            {update.isPending
              ? <Loader2 className="size-4 animate-spin" />
              : saved
                ? <Check className="size-4" />
                : null}
            {saved ? "Saved" : "Save"}
          </Button>
          {update.isError
            ? <p className="text-sm text-destructive">{update.error.message}</p>
            : null}
        </div>
      </CardContent>
    </Card>
  );
}

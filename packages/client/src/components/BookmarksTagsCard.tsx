import type { ComboboxOption } from "@/components/ui/combobox";
import type {
  BookmarksSource,
  BookmarksSourceKind,
  BookmarksTaxonomy,
  LearningAreaTagMap,
  MaterialTypeTagMap,
  SentenceTermCategory,
  TagTermOption,
} from "@sentence-bank/types";
import type { UseQueryResult } from "@tanstack/react-query";

import { useEffect, useRef, useState } from "react";

import { LEARNING_AREAS, MATERIAL_TYPES } from "@sentence-bank/types";
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
import {
  useBookmarksTags,
  useBookmarksTaxonomies,
  useBookmarksTerms,
  useBookmarksVocabulary,
} from "@/hooks/useBookmarks";
import { useBookmarksSettings, useUpdateBookmarksSettings } from "@/hooks/useSettings";

/** The tagging channels, each backed by its own configured source. */
const CHANNELS: { category: SentenceTermCategory;
  title: string;
  hint: string; }[] = [
  {
    category: "vocabulary",
    title: "Vocabulary source",
    hint: "Words and phrases.",
  },
  {
    category: "grammar",
    title: "Grammar source",
    hint: "Grammar points and patterns.",
  },
  {
    category: "general",
    title: "General source",
    hint: "Politeness level, situational context, etc.",
  },
  {
    category: "resource",
    title: "Resources source",
    hint: "Videos, textbook pages, worksheets, and other resources. Items with a runtime power Find a Resource.",
  },
];

/** The editable draft of one channel's source, holding labels so they survive an unreachable host. */
interface ChannelDraft {
  kind: BookmarksSourceKind;
  sourceId: string;
  sourceLabel: string;
  termId: string;
  termLabel: string;
}

const EMPTY_DRAFT: ChannelDraft = {
  kind: "taxonomy",
  sourceId: "",
  sourceLabel: "",
  termId: "",
  termLabel: "",
};

function draftFromSource(source: BookmarksSource | null | undefined): ChannelDraft {
  if (!source) return {
    ...EMPTY_DRAFT,
  };
  return {
    kind: source.kind,
    sourceId: source.id,
    sourceLabel: source.label,
    termId: source.termId ?? "",
    termLabel: source.termLabel ?? "",
  };
}

function draftToSource(draft: ChannelDraft): BookmarksSource | null {
  if (!draft.sourceId) return null;
  const source: BookmarksSource = {
    kind: draft.kind,
    id: draft.sourceId,
    label: draft.sourceLabel,
  };
  if (draft.kind === "taxonomy" && draft.termId) {
    source.termId = draft.termId;
    source.termLabel = draft.termLabel;
  }
  return source;
}

function sourceSummary(source: BookmarksSource | null | undefined): string {
  if (!source) return "No source selected";
  const base = `${source.kind === "tag" ? "Tag" : "Taxonomy"}: ${source.label}`;
  return source.termLabel ? `${base} › ${source.termLabel}` : base;
}

/**
 * One channel's editor: a kind toggle (parent tag vs taxonomy), the source combobox, and — for a
 * taxonomy — an optional "Parent term" combobox that drills into a single term's children.
 */
function SourceFields({
  title,
  hint,
  configured,
  draft,
  onChange,
  tags,
  taxonomies,
  disabled,
}: {
  title: string;
  hint: string;
  configured: BookmarksSource | null | undefined;
  draft: ChannelDraft;
  onChange: (next: ChannelDraft) => void;
  tags: UseQueryResult<TagTermOption[]>;
  taxonomies: UseQueryResult<BookmarksTaxonomy[]>;
  disabled: boolean;
}) {
  const sourceQuery = draft.kind === "tag" ? tags : taxonomies;
  const sourceOptions: ComboboxOption[] = (sourceQuery.data ?? []).map(item => ({
    value: item.id,
    label: item.name,
  }));

  const isTaxonomy = draft.kind === "taxonomy";
  const terms = useBookmarksTerms(isTaxonomy && draft.sourceId ? draft.sourceId : null);
  const termOptions: ComboboxOption[] = [
    {
      value: "",
      label: "Whole taxonomy (no parent term)",
    },
    ...(terms.data ?? []).map(t => ({
      value: t.id,
      label: t.name,
    })),
  ];

  function setKind(kind: BookmarksSourceKind) {
    onChange({
      ...EMPTY_DRAFT,
      kind,
    });
  }

  function setSource(id: string) {
    const label = sourceOptions.find(o => o.value === id)?.label ?? "";
    onChange({
      ...draft,
      sourceId: id,
      sourceLabel: label,
      termId: "",
      termLabel: "",
    });
  }

  function setTerm(id: string) {
    const label = id ? termOptions.find(o => o.value === id)?.label ?? "" : "";
    onChange({
      ...draft,
      termId: id,
      termLabel: label,
    });
  }

  return (
    <div className="space-y-2 rounded-md border p-4">
      <div className="flex items-center justify-between gap-2">
        <Label>{title}</Label>
        <span className="text-xs text-muted-foreground">{sourceSummary(configured)}</span>
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={draft.kind === "taxonomy" ? "default" : "outline"}
          onClick={() => setKind("taxonomy")}
          disabled={disabled}
        >
          Taxonomy
        </Button>
        <Button
          type="button"
          size="sm"
          variant={draft.kind === "tag" ? "default" : "outline"}
          onClick={() => setKind("tag")}
          disabled={disabled}
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
            value={draft.sourceId}
            onChange={setSource}
            options={sourceOptions}
            className="w-full"
            ariaLabel={draft.kind === "tag" ? "Parent tag" : "Taxonomy"}
            placeholder={sourceQuery.isLoading
              ? "Loading…"
              : draft.kind === "tag"
                ? "Select a parent tag…"
                : "Select a taxonomy…"}
          />
        )}
      {isTaxonomy && draft.sourceId && !sourceQuery.isError && (
        <div className="space-y-1 pt-1">
          <Label className="text-xs text-muted-foreground">Parent term (optional)</Label>
          <Combobox
            value={draft.termId}
            onChange={setTerm}
            options={termOptions}
            className="w-full"
            ariaLabel="Parent term"
            placeholder={terms.isLoading
              ? "Loading terms…"
              : terms.isError
                ? "Couldn’t load terms — whole taxonomy"
                : "Whole taxonomy (optional)"}
          />
          <p className="text-xs text-muted-foreground">
            Narrow the choices to one term’s children. New terms are created under it.
          </p>
        </div>
      )}
    </div>
  );
}

/** A `{ key: { id, name } }` map keyed by a fixed set of strings (learning areas or material types). */
type TagMap<K extends string> = Partial<Record<K, { id: string;
  name: string; }>>;

/**
 * Maps each key in a fixed set (learning areas, or material types) to one Resources-source tag. A
 * resource carrying that tag is then badged and filterable by that key on the Collections page. Backs
 * both {@link LearningAreaTagFields} and {@link MaterialTypeTagFields}.
 */
function TagMapFields<K extends string>({
  keys,
  value,
  onChange,
  title,
  hint,
}: {
  keys: readonly K[];
  value: TagMap<K>;
  onChange: (next: TagMap<K>) => void;
  title: string;
  hint: string;
}) {
  const resourceTags = useBookmarksVocabulary("resource");
  const options: ComboboxOption[] = [
    {
      value: "",
      label: "— not mapped —",
    },
    ...(resourceTags.data ?? []).map(t => ({
      value: t.id,
      label: t.name,
    })),
  ];

  function setKey(key: K, id: string) {
    // Rebuild without the key (avoids a dynamic delete), then re-add it when a tag is chosen.
    const next: TagMap<K> = {};
    for (const k of keys) {
      if (k !== key && value[k]) next[k] = value[k];
    }
    if (id) {
      next[key] = {
        id,
        name: options.find(o => o.value === id)?.label ?? id,
      };
    }
    onChange(next);
  }

  return (
    <div className="space-y-3 rounded-md border p-4">
      <div>
        <Label>{title}</Label>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      {resourceTags.isError
        ? (
          <p className="text-sm text-destructive">
            Couldn’t load the Resources source’s tags. Configure the Resources source above first.
          </p>
        )
        : keys.map(key => (
          <div
            key={key}
            className="flex items-center gap-2"
          >
            <Label className="w-24 shrink-0 text-sm font-normal">{key}</Label>
            <Combobox
              value={value[key]?.id ?? ""}
              onChange={id => setKey(key, id)}
              options={options}
              ariaLabel={`${key} tag`}
              placeholder={resourceTags.isLoading ? "Loading tags…" : "— not mapped —"}
              className="w-full max-w-xs"
            />
          </div>
        ))}
    </div>
  );
}

/** Maps each learning area (Speaking, Listening, …) to one Resources-source tag. */
function LearningAreaTagFields({
  value,
  onChange,
}: {
  value: LearningAreaTagMap;
  onChange: (next: LearningAreaTagMap) => void;
}) {
  return (
    <TagMapFields
      keys={LEARNING_AREAS}
      value={value}
      onChange={onChange}
      title="Learning-area tags"
      hint="Map a learning area to one Resources-source tag. Resources carrying it can be filtered by that area on the Collections page, and it drives their session buttons."
    />
  );
}

/** Maps each material type (Graded, Native) to one Resources-source tag. */
function MaterialTypeTagFields({
  value,
  onChange,
}: {
  value: MaterialTypeTagMap;
  onChange: (next: MaterialTypeTagMap) => void;
}) {
  return (
    <TagMapFields
      keys={MATERIAL_TYPES}
      value={value}
      onChange={onChange}
      title="Material-type tags"
      hint="Map a material type to one Resources-source tag. Graded material is written for learners; native material is authentic. Tagged resources are badged and filterable on the Collections page and grammar notes."
    />
  );
}

/**
 * Settings card for the external bookmarks tag/taxonomy integration. The user sets the API endpoint
 * and picks one source per channel (Vocabulary, Grammar, General) — a parent tag (its children become
 * the vocabulary) or a taxonomy (its terms become the vocabulary), optionally drilling into a single
 * parent term. Sentences are then tagged with terms drawn from those sources. All calls go server-side
 * through the middleware proxy. See {@link ../routes/settings.tsx}.
 */
export function BookmarksTagsCard() {
  const settings = useBookmarksSettings();
  const update = useUpdateBookmarksSettings();
  const tags = useBookmarksTags();
  const taxonomies = useBookmarksTaxonomies();

  const [endpointUrl, setEndpointUrl] = useState("");
  const [drafts, setDrafts] = useState<Record<SentenceTermCategory, ChannelDraft>>({
    vocabulary: {
      ...EMPTY_DRAFT,
    },
    grammar: {
      ...EMPTY_DRAFT,
    },
    general: {
      ...EMPTY_DRAFT,
    },
    resource: {
      ...EMPTY_DRAFT,
    },
  });
  const [areaTags, setAreaTags] = useState<LearningAreaTagMap>({});
  const [materialTags, setMaterialTags] = useState<MaterialTypeTagMap>({});
  const [saved, setSaved] = useState(false);

  // Seed local state from the loaded settings once (later refetches must not clobber edits).
  const hydrated = useRef(false);
  useEffect(() => {
    if (hydrated.current || !settings.data) return;
    hydrated.current = true;
    setEndpointUrl(settings.data.endpointUrl ?? "");
    setDrafts({
      vocabulary: draftFromSource(settings.data.source),
      grammar: draftFromSource(settings.data.grammarSource),
      general: draftFromSource(settings.data.generalSource),
      resource: draftFromSource(settings.data.resourceSource),
    });
    setAreaTags(settings.data.learningAreaTags ?? {});
    setMaterialTags(settings.data.materialTypeTags ?? {});
  }, [settings.data]);

  function flashSaved() {
    setSaved(true);
    globalThis.setTimeout(() => setSaved(false), 1500);
  }

  async function save() {
    await update.mutateAsync({
      endpointUrl: endpointUrl.trim() || null,
      source: draftToSource(drafts.vocabulary),
      grammarSource: draftToSource(drafts.grammar),
      generalSource: draftToSource(drafts.general),
      resourceSource: draftToSource(drafts.resource),
      learningAreaTags: areaTags,
      materialTypeTags: materialTags,
    });
    flashSaved();
  }

  const configuredByCategory: Record<SentenceTermCategory, BookmarksSource | null | undefined> = {
    vocabulary: settings.data?.source,
    grammar: settings.data?.grammarSource,
    general: settings.data?.generalSource,
    resource: settings.data?.resourceSource,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bookmarks tags</CardTitle>
        <CardDescription>
          Borrow tag/taxonomy vocabularies from your bookmarks app to tag sentences. Configure a source
          per channel — a parent tag (its children become the choices) or a taxonomy (its terms become
          the choices) — and optionally drill into a parent term.
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

        {CHANNELS.map(channel => (
          <SourceFields
            key={channel.category}
            title={channel.title}
            hint={channel.hint}
            configured={configuredByCategory[channel.category]}
            draft={drafts[channel.category]}
            onChange={next => setDrafts(prev => ({
              ...prev,
              [channel.category]: next,
            }))}
            tags={tags}
            taxonomies={taxonomies}
            disabled={update.isPending}
          />
        ))}

        <LearningAreaTagFields
          value={areaTags}
          onChange={setAreaTags}
        />

        <MaterialTypeTagFields
          value={materialTags}
          onChange={setMaterialTags}
        />

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

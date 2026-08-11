import { sourceAncestors, sourceChildren, sourceSubtreeIds } from "@sentence-bank/types";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Camera, ExternalLink, ImageOff, Images } from "lucide-react";

import { FuriganaScope } from "@/components/ai-lesson/FuriganaScope";
import { FuriganaToggle } from "@/components/ai-lesson/FuriganaToggle";
import { SentenceCard } from "@/components/SentenceCard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useCaptures } from "@/hooks/useCaptures";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useDeleteSentence, useSentences } from "@/hooks/useSentences";
import { useSources } from "@/hooks/useSources";
import { useDeleteVocab, useVocab } from "@/hooks/useVocab";
import { capturesApi } from "@/lib/api";
import { useUiStore } from "@/stores/uiStore";

export const Route = createFileRoute("/sources/$id")({
  component: SourceDetailPage,
});

function SourceDetailPage() {
  const {
    id,
  } = Route.useParams();
  const {
    data: sources, isLoading: sourcesLoading,
  } = useSources();
  const {
    data: sentences,
  } = useSentences({
    kind: "bank",
  });
  const {
    data: vocab,
  } = useVocab();
  const {
    data: captures,
  } = useCaptures();
  const deleteSentence = useDeleteSentence();
  const deleteVocab = useDeleteVocab();
  const showTranslations = useUiStore(s => s.showTranslations);
  const toggleShowTranslations = useUiStore(s => s.toggleShowTranslations);

  const allSources = sources ?? [];
  const source = allSources.find(s => s.id === id) ?? null;
  const ancestors = sourceAncestors(allSources, id);
  const children = sourceChildren(allSources, id);
  const subtree = sourceSubtreeIds(allSources, id);
  const sourceSentences = (sentences ?? []).filter(s => s.sourceId === id);
  const sourceVocab = (vocab ?? []).filter(v => v.sourceId === id);
  const sourceCaptures = (captures ?? []).filter(c => c.sourceId === id);

  /** How many captures sit under a sub-source, counting its own sub-sources. */
  const capturesUnder = (childId: string) => {
    const ids = sourceSubtreeIds(allSources, childId);
    return (captures ?? []).filter(c => c.sourceId && ids.has(c.sourceId)).length;
  };
  const capturesInSubtree = (captures ?? [])
    .filter(c => c.sourceId && subtree.has(c.sourceId)).length;

  usePageTitle(source?.name ?? "");

  return (
    <section className="space-y-6">
      <div>
        <Link
          to="/sources"
          className="
            mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground
            hover:underline
          "
        >
          <ArrowLeft className="size-3.5" />
          Sentence Origins
        </Link>
      </div>

      {sourcesLoading ? <p className="text-muted-foreground">Loading…</p> : null}
      {!sourcesLoading && !source ? <p className="text-muted-foreground">Source not found.</p> : null}

      {source && (
        <>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              {ancestors.length > 0
                ? (
                  <p
                    className="
                      flex flex-wrap items-center gap-1 text-sm
                      text-muted-foreground
                    "
                  >
                    {ancestors.map((a, i) => (
                      <span
                        key={a.id}
                        className="inline-flex items-center gap-1"
                      >
                        {i > 0 ? <span aria-hidden="true">›</span> : null}
                        <Link
                          to="/sources/$id"
                          params={{
                            id: a.id,
                          }}
                          className="hover:underline"
                        >
                          {a.name}
                        </Link>
                      </span>
                    ))}
                  </p>
                )
                : null}
              {source.type
                ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-muted-foreground">{source.type}</span>
                  </div>
                )
                : null}
              {source.author ? <p className="text-sm text-muted-foreground">{source.author}</p> : null}
              {source.url
                ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="
                      inline-flex items-center gap-1 text-sm text-blue-700
                      hover:underline
                    "
                  >
                    <ExternalLink className="size-3.5" />
                    {source.url}
                  </a>
                )
                : null}
              {source.notes ? <p className="text-sm whitespace-pre-wrap">{source.notes}</p> : null}
            </div>
            <Link
              to="/captures"
              search={{
                source: source.id,
              }}
              className="
                inline-flex shrink-0 items-center gap-1 text-sm
                text-muted-foreground
                hover:text-blue-700
              "
            >
              <Images className="size-4" />
              {/* The captures list filtered to this source *and* its sub-sources — hence the count
                  here can exceed the "Captures" section below, which is this tier's own. */}
              {`Browse captures (${capturesInSubtree})`}
            </Link>
          </div>

          {/* Sub-sources — the tiers below this one (a magazine's issues, an issue's pages). */}
          {children.length > 0
            ? (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">
                  {`Sub-sources (${children.length})`}
                </h2>
                <div
                  className="
                    grid gap-3
                    sm:grid-cols-2
                  "
                >
                  {children.map(child => (
                    <Card key={child.id}>
                      <CardContent className="space-y-1 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            to="/sources/$id"
                            params={{
                              id: child.id,
                            }}
                            className="
                              font-medium
                              hover:underline
                            "
                          >
                            {child.name}
                          </Link>
                          {child.type
                            ? <span className="text-xs text-muted-foreground">{child.type}</span>
                            : null}
                        </div>
                        {child.url
                          ? (
                            <a
                              href={child.url}
                              target="_blank"
                              rel="noreferrer"
                              className="
                                inline-flex items-center gap-1 text-sm break-all
                                text-blue-700
                                hover:underline
                              "
                            >
                              <ExternalLink className="size-3.5 shrink-0" />
                              {child.url}
                            </a>
                          )
                          : null}
                        <p className="text-xs text-muted-foreground">
                          {`${capturesUnder(child.id)} capture(s)`}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
            : null}

          {/* Captures filed directly against this source — the scans this exact page is made of. */}
          {sourceCaptures.length > 0
            ? (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">
                  {`Captures (${sourceCaptures.length})`}
                </h2>
                <div
                  className="
                    grid gap-3
                    sm:grid-cols-2
                  "
                >
                  {sourceCaptures.map(capture => (
                    <Link
                      key={capture.id}
                      to="/captures/$id"
                      params={{
                        id: capture.id,
                      }}
                      className="block"
                    >
                      <Card
                        className="
                          h-full transition-colors
                          hover:border-ring
                        "
                      >
                        <CardContent className="flex gap-3 p-4">
                          <div
                            className="
                              flex size-16 shrink-0 items-center justify-center
                              overflow-hidden rounded-md border border-input
                              bg-muted
                            "
                          >
                            {capture.hasImage
                              ? (
                                <img
                                  src={capturesApi.imageUrl(capture.id)}
                                  alt=""
                                  className="size-full object-contain"
                                />
                              )
                              : (
                                <ImageOff
                                  className="size-5 text-muted-foreground"
                                />
                              )}
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate font-medium">
                                {capture.title || capture.text.slice(0, 40) || "Untitled capture"}
                              </p>
                              <Badge variant={capture.status === "parsed" ? "secondary" : "outline"}>
                                {capture.status}
                              </Badge>
                            </div>
                            {capture.page
                              ? (
                                <p
                                  className="text-xs text-muted-foreground"
                                >{`p. ${capture.page}`}
                                </p>
                              )
                              : null}
                            <p
                              className="
                                line-clamp-2 text-sm text-muted-foreground
                              "
                            >
                              {capture.text}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )
            : null}

          {/* Sentences */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">
                Sentences (
                {sourceSentences.length}
                )
              </h2>
              <div className="flex items-center gap-4">
                <label
                  className="
                    flex items-center gap-2 text-sm text-muted-foreground
                  "
                >
                  <input
                    type="checkbox"
                    checked={showTranslations}
                    onChange={toggleShowTranslations}
                  />
                  Show translations
                </label>
                <FuriganaToggle />
              </div>
            </div>
            {sourceSentences.length === 0
              ? <p className="text-sm text-muted-foreground">No sentences from this source yet.</p>
              : (
                <FuriganaScope>
                  <div className="space-y-4">
                    {sourceSentences.map(s => (
                      <SentenceCard
                        key={s.id}
                        sentence={s}
                        showTranslation={showTranslations}
                        sourceName={source.name}
                        onDelete={(sid) => {
                          if (globalThis.confirm("Delete this sentence?")) deleteSentence.mutate(sid);
                        }}
                      />
                    ))}
                  </div>
                </FuriganaScope>
              )}
          </div>

          {/* Vocab */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">
              Vocab (
              {sourceVocab.length}
              )
            </h2>
            {sourceVocab.length === 0
              ? <p className="text-sm text-muted-foreground">No vocab from this source yet.</p>
              : (
                <div
                  className="
                    grid gap-4
                    sm:grid-cols-2
                    lg:grid-cols-3
                  "
                >
                  {sourceVocab.map(v => (
                    <Card key={v.id}>
                      <CardContent className="space-y-1 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-lg font-semibold">{v.term}</p>
                          <button
                            type="button"
                            onClick={() => {
                              if (globalThis.confirm("Delete this vocab entry?")) {
                                deleteVocab.mutate(v.id);
                              }
                            }}
                            className="
                              text-xs text-destructive
                              hover:underline
                            "
                          >
                            Delete
                          </button>
                        </div>
                        {v.reading
                          ? (
                            <p
                              className="text-sm text-muted-foreground"
                            >{v.reading}
                            </p>
                          )
                          : null}
                        {v.meaning ? <p className="text-sm">{v.meaning}</p> : null}
                        {v.captureId
                          ? (
                            <Link
                              to="/captures/$id"
                              params={{
                                id: v.captureId,
                              }}
                              className="
                                inline-flex items-center gap-1 text-xs
                                text-muted-foreground
                                hover:text-blue-700
                              "
                            >
                              <Camera className="size-3" />
                              Capture
                            </Link>
                          )
                          : null}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
          </div>
        </>
      )}
    </section>
  );
}

import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Camera, ExternalLink, Images } from "lucide-react";

import { FuriganaScope } from "@/components/ai-lesson/FuriganaScope";
import { FuriganaToggle } from "@/components/ai-lesson/FuriganaToggle";
import { SentenceCard } from "@/components/SentenceCard";
import { Card, CardContent } from "@/components/ui/card";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useDeleteSentence, useSentences } from "@/hooks/useSentences";
import { useSources } from "@/hooks/useSources";
import { useDeleteVocab, useVocab } from "@/hooks/useVocab";
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
  } = useSentences();
  const {
    data: vocab,
  } = useVocab();
  const deleteSentence = useDeleteSentence();
  const deleteVocab = useDeleteVocab();
  const showTranslations = useUiStore(s => s.showTranslations);
  const toggleShowTranslations = useUiStore(s => s.toggleShowTranslations);

  const source = sources?.find(s => s.id === id) ?? null;
  const sourceSentences = (sentences ?? []).filter(s => s.sourceId === id);
  const sourceVocab = (vocab ?? []).filter(v => v.sourceId === id);

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
          Sources
        </Link>
      </div>

      {sourcesLoading ? <p className="text-muted-foreground">Loading…</p> : null}
      {!sourcesLoading && !source ? <p className="text-muted-foreground">Source not found.</p> : null}

      {source && (
        <>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
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
              Captures
            </Link>
          </div>

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

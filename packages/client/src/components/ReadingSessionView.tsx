import type { ReadingSession } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useSources } from "@/hooks/useSources";

/** A labelled block of read-only text; renders nothing when empty. */
function Field({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  if (!value) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="whitespace-pre-wrap">{value}</p>
    </div>
  );
}

/**
 * Read-only render of a reading session: its origin, the freeform or line-by-line translation, an
 * optional whole-passage summary, and the word notes with shaky/unknown + flashcard markers. All
 * editing happens on the separate edit page.
 */
export function ReadingSessionView({
  session,
}: {
  session: ReadingSession;
}) {
  const {
    data: sources,
  } = useSources();
  const sourceName = session.sourceId
    ? (sources ?? []).find(s => s.id === session.sourceId)?.name ?? null
    : null;
  const wordNotes = session.wordNotes ?? [];
  const lines = session.lines ?? [];

  return (
    <Card>
      <CardContent className="space-y-6 p-4">
        <div className="space-y-1">
          <p className="text-xl font-semibold">{session.title}</p>
          <div
            className="
              flex flex-wrap items-center gap-2 text-xs text-muted-foreground
            "
          >
            <span>{session.language}</span>
            <Badge variant="secondary">
              {session.mode === "line-by-line" ? "Line by line" : "Freeform"}
            </Badge>
            {sourceName && session.sourceId
              ? (
                <Link
                  to="/sources/$id"
                  params={{
                    id: session.sourceId,
                  }}
                  className="hover:text-foreground"
                >
                  From: {sourceName}
                </Link>
              )
              : null}
            {session.page ? <span>· {session.page}</span> : null}
          </div>
        </div>

        <Field
          label="Summary"
          value={session.summary}
        />

        {session.mode === "line-by-line"
          ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold">Lines</p>
              {lines.length === 0
                ? <p className="text-sm text-muted-foreground">No lines recorded.</p>
                : (
                  <ul className="space-y-3">
                    {lines.map(line => (
                      <li
                        key={line.id}
                        className="space-y-1 rounded-md border p-3"
                      >
                        <p className="text-base">{line.text}</p>
                        {line.translation
                          ? (
                            <p className="text-sm text-muted-foreground">
                              {line.summaryOnly ? "Summary: " : ""}
                              {line.translation}
                            </p>
                          )
                          : null}
                        {line.needsCorrection || line.correction
                          ? (
                            <div className="space-y-1 pt-1">
                              <Badge variant="destructive">Needs correction</Badge>
                              {line.correction
                                ? <p className="text-sm">{line.correction}</p>
                                : null}
                            </div>
                          )
                          : null}
                      </li>
                    ))}
                  </ul>
                )}
            </div>
          )
          : (
            <>
              <Field
                label="Passage"
                value={session.passage}
              />
              <Field
                label="Translation"
                value={session.freeformTranslation}
              />
            </>
          )}

        <div className="space-y-3">
          <p className="text-sm font-semibold">Word notes</p>
          {wordNotes.length === 0
            ? <p className="text-sm text-muted-foreground">No words noted.</p>
            : (
              <ul className="space-y-2">
                {wordNotes.map(w => (
                  <li
                    key={w.id}
                    className="
                      flex flex-wrap items-center gap-2 rounded-md border p-2
                      text-sm
                    "
                  >
                    <span className="font-medium">{w.word}</span>
                    {w.reading ? <span className="text-muted-foreground">{w.reading}</span> : null}
                    {w.meaning ? <span className="text-muted-foreground">— {w.meaning}</span> : null}
                    <Badge
                      variant={w.status === "unknown" ? "destructive" : "secondary"}
                      className="ml-auto"
                    >
                      {w.status === "unknown" ? "Didn't know" : "Shaky"}
                    </Badge>
                    {w.flashcard ? <Badge variant="outline">Flashcard</Badge> : null}
                  </li>
                ))}
              </ul>
            )}
        </div>
      </CardContent>
    </Card>
  );
}

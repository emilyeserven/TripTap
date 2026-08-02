import type { ReadingLine, ReadingSession, WordNote } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";

import { AddSentenceFromWordNoteDialog } from "@/components/AddSentenceFromWordNoteDialog";
import { GrammarTermBadges } from "@/components/GrammarTermBadges";
import { TranslationVerdictEditor } from "@/components/TranslationVerdictEditor";
import { Badge } from "@/components/ui/badge";
import { useUpdateReadingSession } from "@/hooks/useReadingSessions";
import { useSources } from "@/hooks/useSources";
import { READING_DIFFICULTIES } from "@/lib/reading-difficulty";

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
 * Render of a reading session: its origin, the freeform or line-by-line translation, an optional
 * whole-passage summary, and the word notes with shaky/unknown + flashcard markers. Mostly read-only,
 * but each translation's self-assessment verdict + comment are editable inline here via
 * {@link TranslationVerdictEditor} (the reference translation is authored on the edit page); all other
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
  const update = useUpdateReadingSession();
  const sourceName = session.sourceId
    ? (sources ?? []).find(s => s.id === session.sourceId)?.name ?? null
    : null;
  const wordNotes = session.wordNotes ?? [];
  const lines = session.lines ?? [];
  const difficulty = READING_DIFFICULTIES.find(d => d.value === session.difficulty);
  // Show the multiplier only when it actually changes XP (i.e. anything but medium).
  const difficultyLabel = difficulty
    ? difficulty.value === "medium"
      ? difficulty.label
      : `${difficulty.label} ${difficulty.multiplier}`
    : null;

  /** Patch a single line in place and persist the whole lines array. */
  const saveLine = (id: string, patch: Partial<ReadingLine>) =>
    update.mutateAsync({
      id: session.id,
      input: {
        lines: lines.map(l => (l.id === id
          ? {
            ...l,
            ...patch,
          }
          : l)),
      },
    }).then(() => undefined);

  /** Patch a single word note in place and persist the whole wordNotes array. */
  const saveWordNote = (id: string, patch: Partial<WordNote>) =>
    update.mutateAsync({
      id: session.id,
      input: {
        wordNotes: wordNotes.map(w => (w.id === id
          ? {
            ...w,
            ...patch,
          }
          : w)),
      },
    }).then(() => undefined);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-xl font-semibold">{session.title}</p>
        <div
          className="
            flex flex-wrap items-center gap-2 text-xs text-muted-foreground
          "
        >
          <span>{session.language}</span>
          {session.passive
            ? (
              <>
                <Badge variant="secondary">Passive</Badge>
                <span>{session.timeSpentMinutes} min read</span>
              </>
            )
            : (
              <Badge variant="secondary">
                {session.mode === "line-by-line"
                  ? "Line by line"
                  : session.mode === "summary"
                    ? "Just summarize"
                    : "Freeform"}
              </Badge>
            )}
          {difficultyLabel
            ? <Badge variant="outline">{difficultyLabel}</Badge>
            : null}
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
        {session.bookmarkId && session.bookmarkTitle && (
          <p className="text-sm text-muted-foreground">
            From resource:
            {" "}
            <span className="font-medium text-foreground">{session.bookmarkTitle}</span>
            {session.section && (
              <span> · {session.section.label}</span>
            )}
            {session.bookmarkUrl && (
              <a
                href={session.bookmarkUrl}
                target="_blank"
                rel="noreferrer"
                className="
                  ml-2 inline-flex items-center gap-1 text-primary
                  hover:underline
                "
              >
                open
                <ExternalLink className="size-3" />
              </a>
            )}
          </p>
        )}
      </div>

      {!session.passive && (
        <>
          <Field
            label="Summary"
            value={session.summary}
          />

          {session.mode === "summary"
            ? null
            : session.mode === "line-by-line"
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
                            {line.grammarTerms && line.grammarTerms.length > 0
                              ? (
                                <div
                                  className="pt-1 text-xs text-muted-foreground"
                                >
                                  <GrammarTermBadges terms={line.grammarTerms} />
                                </div>
                              )
                              : null}
                            <TranslationVerdictEditor
                              referenceTranslation={line.correction}
                              verdict={line.verdict}
                              note={line.note}
                              onSave={patch => saveLine(line.id, patch)}
                            />
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
                  <TranslationVerdictEditor
                    referenceTranslation={session.freeformCorrection}
                    verdict={session.freeformVerdict}
                    note={session.freeformNote}
                    onSave={patch =>
                      update.mutateAsync({
                        id: session.id,
                        input: {
                          freeformVerdict: patch.verdict,
                          freeformNote: patch.note,
                        },
                      }).then(() => undefined)}
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
                      <AddSentenceFromWordNoteDialog
                        note={w}
                        language={session.language}
                        onLinked={mySentenceId => saveWordNote(w.id, {
                          mySentenceId,
                        })}
                      />
                    </li>
                  ))}
                </ul>
              )}
          </div>
        </>
      )}
    </div>
  );
}

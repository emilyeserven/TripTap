import type { KanjiDetail, KanjiOccurrence, KanjiSourceKind, KanjiStatus } from "@sentence-bank/types";

import { useEffect, useState } from "react";

import { KANJI_STATUSES } from "@sentence-bank/types";
import { Link } from "@tanstack/react-router";

import { FuriganaScope } from "./ai-lesson/FuriganaScope";
import { SentenceText } from "./SentenceText";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useSetKanjiStatus } from "@/hooks/useKanji";

/** Section heading per source kind, in the order the detail page lists them. */
const KIND_LABEL: Record<KanjiSourceKind, string> = {
  "sentence": "Sentences",
  "vocab": "Vocabulary",
  "my-sentence": "My sentences",
  "practice": "Practice sentences",
  "dialogue": "Dialogues",
  "writing": "Writing",
};

const KIND_ORDER: KanjiSourceKind[] = [
  "sentence",
  "vocab",
  "my-sentence",
  "practice",
  "dialogue",
  "writing",
];

/** Button copy for each status. */
const STATUS_LABEL: Record<KanjiStatus, string> = {
  new: "Not started",
  learning: "Learning",
  known: "Known",
};

/** A date as the short local form the rest of the app uses for timestamps. */
function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

/**
 * The item's own page, when it has one.
 *
 * Every sentence kind shares the unified `/sentences/$id` page since the table merge (bank rows
 * included — they gained a detail page). Vocab still lives on one filterable page rather than
 * per-row routes, so it renders as plain text.
 */
function OccurrenceLink({
  item, children,
}: {
  item: KanjiOccurrence;
  children: React.ReactNode;
}) {
  const className = "hover:underline";
  if (item.kind === "sentence" || item.kind === "my-sentence" || item.kind === "practice") {
    return (
      <Link
        to="/sentences/$id"
        params={{
          id: item.id,
        }}
        className={className}
      >
        {children}
      </Link>
    );
  }
  if (item.kind === "dialogue") {
    return (
      <Link
        to="/dialogues/$id"
        params={{
          id: item.id,
        }}
        className={className}
      >
        {children}
      </Link>
    );
  }
  if (item.kind === "writing") {
    return (
      <Link
        to="/my-writing/$id"
        params={{
          id: item.id,
        }}
        className={className}
      >
        {children}
      </Link>
    );
  }
  return <>{children}</>;
}

/** One occurrence: the text (with ruby where the source stored a reading) plus its gloss. */
function OccurrenceRow({
  item,
}: {
  item: KanjiOccurrence;
}) {
  return (
    <li
      className="
        border-b py-2
        last:border-b-0
      "
    >
      <OccurrenceLink item={item}>
        <span className="whitespace-pre-wrap">
          <SentenceText
            text={item.text}
            reading={item.reading}
          />
        </span>
      </OccurrenceLink>
      {item.gloss
        ? <p className="text-sm text-muted-foreground">{item.gloss}</p>
        : null}
    </li>
  );
}

/**
 * A single character: how much of the corpus it appears in, the learner's status and note, and every
 * item containing it grouped by where it came from.
 */
export function KanjiDetailView({
  detail,
}: {
  detail: KanjiDetail;
}) {
  const setStatus = useSetKanjiStatus();
  const [note, setNote] = useState(detail.note ?? "");

  // The note is a draft until saved, but a different character (or a save elsewhere) must replace it.
  useEffect(() => {
    setNote(detail.note ?? "");
  }, [detail.char, detail.note]);

  const save = (status: KanjiStatus, nextNote: string | null) =>
    setStatus.mutate({
      char: detail.char,
      input: {
        status,
        note: nextNote,
      },
    });

  const byKind = KIND_ORDER
    .map(kind => ({
      kind,
      items: detail.items.filter(i => i.kind === kind),
    }))
    .filter(g => g.items.length > 0);

  return (
    <FuriganaScope>
      <section className="space-y-6">
        <div className="flex flex-wrap items-center gap-6">
          <span className="text-7xl leading-none">{detail.char}</span>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Occurrences</dt>
            <dd>{detail.occurrences}</dd>
            <dt className="text-muted-foreground">Items</dt>
            <dd>{detail.itemCount}</dd>
            <dt className="text-muted-foreground">First seen</dt>
            <dd>{shortDate(detail.firstSeenAt)}</dd>
            <dt className="text-muted-foreground">Last seen</dt>
            <dd>{shortDate(detail.lastSeenAt)}</dd>
          </dl>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {KANJI_STATUSES.map(status => (
                <Button
                  key={status}
                  variant={detail.status === status ? "default" : "outline"}
                  disabled={setStatus.isPending}
                  onClick={() => save(status, note.trim() || null)}
                >
                  {STATUS_LABEL[status]}
                </Button>
              ))}
            </div>
            <Textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Mnemonics, look-alikes, anything worth remembering…"
              aria-label={`Note on ${detail.char}`}
            />
            <Button
              variant="secondary"
              disabled={setStatus.isPending || note === (detail.note ?? "")}
              onClick={() => save(detail.status, note.trim() || null)}
            >
              Save note
            </Button>
          </CardContent>
        </Card>

        {byKind.map(group => (
          <div
            key={group.kind}
            className="space-y-1"
          >
            <h2 className="text-lg font-semibold">
              {KIND_LABEL[group.kind]}
              {" "}
              <span className="text-sm font-normal text-muted-foreground">
                (
                {group.items.length}
                )
              </span>
            </h2>
            <ul>
              {group.items.map(item => (
                <OccurrenceRow
                  key={`${item.kind}:${item.id}`}
                  item={item}
                />
              ))}
            </ul>
          </div>
        ))}
      </section>
    </FuriganaScope>
  );
}

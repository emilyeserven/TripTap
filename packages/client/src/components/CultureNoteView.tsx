import type { CultureNote } from "@sentence-bank/types";

import { AiLessonIcon } from "@/components/ai-lesson/icon-map";
import { VocabPill } from "@/components/ai-lesson/VocabPill";
import { Badge } from "@/components/ui/badge";
import { useCultureTopics } from "@/hooks/useCultureTopics";

/** Read-only detail view of one culture note. */
export function CultureNoteView({
  note,
}: { note: CultureNote }) {
  const {
    data: topics,
  } = useCultureTopics();
  const topicNames = note.topicIds
    .map(id => topics?.find(t => t.id === id)?.name)
    .filter((name): name is string => name !== undefined);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span
          className="
            flex size-10 shrink-0 items-center justify-center rounded-md
            bg-muted
          "
        >
          <AiLessonIcon
            name={note.icon ?? "landmark"}
            className="size-5"
          />
        </span>
        <div className="min-w-0">
          {note.titleJp
            ? (
              <h2
                lang="ja"
                className="text-xl font-semibold"
              >
                {note.titleJp}
              </h2>
            )
            : null}
          {note.titleEn
            ? <p className="text-muted-foreground">{note.titleEn}</p>
            : null}
          {!note.titleJp && !note.titleEn
            ? <p className="text-muted-foreground">Untitled note</p>
            : null}
        </div>
      </div>

      {note.bodyJa
        ? (
          <p
            lang="ja"
            className="text-base/relaxed whitespace-pre-wrap"
          >
            {note.bodyJa}
          </p>
        )
        : null}
      {note.bodyEn
        ? (
          <p
            className={note.bodyJa
              ? "text-base/relaxed whitespace-pre-wrap text-muted-foreground"
              : "text-base/relaxed whitespace-pre-wrap"}
          >
            {note.bodyEn}
          </p>
        )
        : null}

      {topicNames.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {topicNames.map(name => (
            <Badge
              key={name}
              variant="outline"
            >
              {name}
            </Badge>
          ))}
        </div>
      )}

      {note.terms.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {note.terms.map(t => (
            <VocabPill
              key={t}
              term={t}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {`Added ${new Date(note.createdAt).toLocaleDateString()}`}
      </p>
    </div>
  );
}

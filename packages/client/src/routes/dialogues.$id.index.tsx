import { useState } from "react";

import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, Pencil } from "lucide-react";

import { DialogueSpeakerFilter } from "@/components/DialogueSpeakerFilter";
import { DialogueStepper } from "@/components/DialogueStepper";
import { DialogueTranscript } from "@/components/DialogueTranscript";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useDialogue } from "@/hooks/useDialogues";
import { usePageTitle } from "@/hooks/usePageTitle";

export const Route = createFileRoute("/dialogues/$id/")({
  component: DialogueViewPage,
});

function DialogueViewPage() {
  const {
    id,
  } = Route.useParams();
  const {
    data, isLoading, error,
  } = useDialogue(id);
  usePageTitle(data?.title ?? "Dialogue");

  // Practice state is deliberately not persisted: hiding a speaker is something you do for one run,
  // not a property of the dialogue. Same for line-by-line mode and its read-aloud option.
  const [hiddenSpeakers, setHiddenSpeakers] = useState<string[]>([]);
  const [showTranslations, setShowTranslations] = useState(false);
  const [lineByLine, setLineByLine] = useState(false);
  const [autoRead, setAutoRead] = useState(false);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!data) return <p className="text-muted-foreground">Dialogue not found.</p>;

  const lines = data.lines ?? [];
  const hasTranslations = lines.some(line => line.translation);

  return (
    <section className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
        >
          <Link to="/dialogues">
            <ArrowLeft className="size-4" />
            All dialogues
          </Link>
        </Button>
        <Button
          asChild
          variant="ghost"
          size="sm"
        >
          <Link
            to="/dialogues/$id/edit"
            params={{
              id,
            }}
          >
            <Pencil className="size-4" />
            Edit
          </Link>
        </Button>
      </div>

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{data.title}</h1>
        <p
          className="
            flex flex-wrap items-center gap-2 text-sm text-muted-foreground
          "
        >
          <span>{data.date}</span>
          <span>·</span>
          <span>{data.language}</span>
          {data.countsTowardXp && (
            <Badge variant="secondary">
              Earns XP · {data.learningArea ?? "Speaking"}
            </Badge>
          )}
        </p>
        {data.bookmarkId && data.bookmarkTitle && (
          <p className="text-sm text-muted-foreground">
            From resource:
            {" "}
            <span className="font-medium text-foreground">{data.bookmarkTitle}</span>
            {data.section && <span> · {data.section.label}</span>}
            {data.bookmarkUrl && (
              <a
                href={data.bookmarkUrl}
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        {/*
          Hiding a speaker is a property of the practice run, not of one view, so the chips stay put
          when the learner switches into line-by-line — the stepper honours the same hidden set.
        */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <DialogueSpeakerFilter
            lines={data.lines}
            selfSpeakers={data.selfSpeakers}
            hiddenSpeakers={hiddenSpeakers}
            onChange={setHiddenSpeakers}
          />
          {lineByLine && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={autoRead}
                onCheckedChange={next => setAutoRead(next === true)}
                aria-label="Read other speakers aloud"
              />
              Read other speakers aloud
            </label>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasTranslations && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-pressed={showTranslations}
              onClick={() => setShowTranslations(v => !v)}
            >
              {showTranslations ? "Blur translations" : "Show translations"}
            </Button>
          )}
          {lines.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-pressed={lineByLine}
              onClick={() => setLineByLine(v => !v)}
            >
              {lineByLine ? "Show whole dialogue" : "Line-by-line"}
            </Button>
          )}
        </div>
      </div>

      {lineByLine
        ? (
          <DialogueStepper
            lines={lines}
            selfSpeakers={data.selfSpeakers}
            hiddenSpeakers={hiddenSpeakers}
            autoRead={autoRead}
            showTranslations={showTranslations}
          />
        )
        : (
          <DialogueTranscript
            lines={data.lines}
            selfSpeakers={data.selfSpeakers}
            hiddenSpeakers={hiddenSpeakers}
            showTranslations={showTranslations}
          />
        )}
    </section>
  );
}

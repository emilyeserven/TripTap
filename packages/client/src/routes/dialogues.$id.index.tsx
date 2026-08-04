import { useState } from "react";

import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Pencil } from "lucide-react";

import { DialogueSpeakerFilter } from "@/components/DialogueSpeakerFilter";
import { DialogueTranscript } from "@/components/DialogueTranscript";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  // not a property of the dialogue.
  const [hiddenSpeakers, setHiddenSpeakers] = useState<string[]>([]);
  const [showTranslations, setShowTranslations] = useState(false);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!data) return <p className="text-muted-foreground">Dialogue not found.</p>;

  const hasTranslations = (data.lines ?? []).some(line => line.translation);

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
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <DialogueSpeakerFilter
          lines={data.lines}
          selfSpeakers={data.selfSpeakers}
          hiddenSpeakers={hiddenSpeakers}
          onChange={setHiddenSpeakers}
        />
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
      </div>

      <DialogueTranscript
        lines={data.lines}
        selfSpeakers={data.selfSpeakers}
        hiddenSpeakers={hiddenSpeakers}
        showTranslations={showTranslations}
      />
    </section>
  );
}

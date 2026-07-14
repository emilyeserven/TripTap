import { useMemo, useState } from "react";

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LightbulbIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { WritingCard } from "@/components/WritingCard";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useWritingPrompts } from "@/hooks/useWritingPrompts";
import { useCreateWriting, useDeleteWriting, useWritings } from "@/hooks/useWritings";

export const Route = createFileRoute("/my-writing/")({
  component: MyWritingPage,
});

function MyWritingPage() {
  usePageTitle("My Writing");
  const {
    data: writings, isLoading, error,
  } = useWritings();
  const createWriting = useCreateWriting();
  const deleteWriting = useDeleteWriting();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [onlyReady, setOnlyReady] = useState(false);
  const [promptPickerOpen, setPromptPickerOpen] = useState(false);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (writings ?? []).filter((w) => {
      if (onlyReady && !w.readyToReview) return false;
      if (!q) return true;
      return w.text.toLowerCase().includes(q)
        || (w.meaning ?? "").toLowerCase().includes(q)
        || (w.comments ?? "").toLowerCase().includes(q);
    });
  }, [writings, search, onlyReady]);

  const nothing = !isLoading && shown.length === 0;

  const startWriting = (seed?: { promptTitle: string;
    promptText: string; }) => {
    createWriting.mutate(
      {
        text: "",
        language: "Japanese",
        readyToReview: false,
        promptTitle: seed?.promptTitle ?? null,
        promptText: seed?.promptText ?? null,
      },
      {
        onSuccess: writing =>
          navigate({
            to: "/my-writing/$id",
            params: {
              id: writing.id,
            },
          }),
      },
    );
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            Write freely in Japanese. Note what you meant, add comments, tag what you were targeting,
            and flag it ready to review. Open an entry to edit it or turn on correction mode to fix a
            sentence and send it to My Sentences.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Dialog
            open={promptPickerOpen}
            onOpenChange={setPromptPickerOpen}
          >
            <DialogTrigger asChild>
              <Button
                variant="outline"
                disabled={createWriting.isPending}
              >
                <LightbulbIcon className="size-4" />
                From a prompt
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start from a prompt</DialogTitle>
              </DialogHeader>
              <PromptPicker
                onPick={(promptTitle, promptText) => {
                  setPromptPickerOpen(false);
                  startWriting({
                    promptTitle,
                    promptText,
                  });
                }}
              />
            </DialogContent>
          </Dialog>
          <Button
            onClick={() => startWriting()}
            disabled={createWriting.isPending}
          >
            <PlusIcon className="size-4" />
            New writing
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search your writing…"
          aria-label="Search my writing"
          className="max-w-sm"
        />
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={onlyReady}
            onChange={e => setOnlyReady(e.target.checked)}
          />
          Ready to review only
        </label>
      </div>

      {error ? <p className="text-destructive">{error.message}</p> : null}
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
      {nothing
        ? (
          <p className="text-muted-foreground">
            Nothing yet. Click “New writing” to start.
          </p>
        )
        : null}

      <div className="space-y-4">
        {shown.map(writing => (
          <WritingCard
            key={writing.id}
            writing={writing}
            onDelete={id => deleteWriting.mutate(id)}
          />
        ))}
      </div>
    </section>
  );
}

/** Lets the learner pick one saved writing prompt to start a new entry from. */
function PromptPicker({
  onPick,
}: {
  onPick: (title: string, text: string) => void;
}) {
  const {
    data: prompts, isLoading, error,
  } = useWritingPrompts();

  if (isLoading) return <p className="text-muted-foreground">Loading prompts…</p>;
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!prompts || prompts.length === 0) {
    return (
      <p className="text-muted-foreground">
        No prompts yet. Add some on the Writing Prompts page first.
      </p>
    );
  }

  return (
    <div
      className="max-h-[60vh] space-y-2 overflow-y-auto"
    >
      {prompts.map(prompt => (
        <button
          key={prompt.id}
          type="button"
          onClick={() => onPick(prompt.text, prompt.textEn ?? prompt.text)}
          className="
            w-full rounded-md border p-3 text-left
            hover:bg-accent
          "
        >
          <p className="font-semibold">{prompt.text}</p>
          {prompt.textEn
            ? <p className="line-clamp-2 text-sm text-muted-foreground">{prompt.textEn}</p>
            : null}
        </button>
      ))}
    </div>
  );
}

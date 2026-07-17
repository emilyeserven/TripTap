import type { WritingPromptDifficulty } from "@sentence-bank/types";

import { useMemo, useState } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { WritingPromptBulkDialog } from "@/components/WritingPromptBulkDialog";
import { WritingPromptCard } from "@/components/WritingPromptCard";
import { WritingPromptFields } from "@/components/WritingPromptFields";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useCreateWritingPrompt, useWritingPrompts } from "@/hooks/useWritingPrompts";

export const Route = createFileRoute("/writing-prompts/")({
  component: WritingPromptsPage,
});

function WritingPromptsPage() {
  usePageTitle("Writing Prompts");
  const {
    data: prompts, isLoading, error,
  } = useWritingPrompts();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (prompts ?? []).filter((p) => {
      if (!q) return true;
      return p.text.toLowerCase().includes(q) || (p.textEn ?? "").toLowerCase().includes(q);
    });
  }, [prompts, search]);

  const nothing = !isLoading && shown.length === 0;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            Save reusable prompts to spark a free-write. When you start a new My Writing entry you can
            pull one up to write against.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <WritingPromptBulkDialog />
          <Dialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <PlusIcon className="size-4" />
                New prompt
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New prompt</DialogTitle>
              </DialogHeader>
              <NewPromptForm onDone={() => setDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search prompts…"
        aria-label="Search writing prompts"
        className="max-w-sm"
      />

      {error ? <p className="text-destructive">{error.message}</p> : null}
      {isLoading ? <p className="text-muted-foreground">Loading…</p> : null}
      {nothing
        ? (
          <p className="text-muted-foreground">
            No prompts yet. Click “New prompt” to add one.
          </p>
        )
        : null}

      <div className="space-y-4">
        {shown.map(prompt => (
          <WritingPromptCard
            key={prompt.id}
            prompt={prompt}
          />
        ))}
      </div>
    </section>
  );
}

function NewPromptForm({
  onDone,
}: {
  onDone: () => void;
}) {
  const createPrompt = useCreateWritingPrompt();
  const [title, setTitle] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [text, setText] = useState("");
  const [textEn, setTextEn] = useState("");
  const [difficulty, setDifficulty] = useState<WritingPromptDifficulty>("Other");

  const submit = () => {
    const nextText = text.trim();
    if (!nextText) return;
    createPrompt.mutate(
      {
        title: title.trim() || null,
        titleEn: titleEn.trim() || null,
        text: nextText,
        textEn: textEn.trim() || null,
        difficulty,
      },
      {
        onSuccess: onDone,
      },
    );
  };

  return (
    <div className="space-y-4">
      <WritingPromptFields
        title={title}
        titleEn={titleEn}
        text={text}
        textEn={textEn}
        difficulty={difficulty}
        onTitleChange={setTitle}
        onTitleEnChange={setTitleEn}
        onTextChange={setText}
        onTextEnChange={setTextEn}
        onDifficultyChange={setDifficulty}
      />
      <div className="flex justify-end">
        <Button
          onClick={submit}
          disabled={!text.trim() || createPrompt.isPending}
        >
          Add prompt
        </Button>
      </div>
    </div>
  );
}

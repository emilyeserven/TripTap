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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WritingPromptCard } from "@/components/WritingPromptCard";
import {
  useCreateWritingPrompt,
  useDeleteWritingPrompt,
  useUpdateWritingPrompt,
  useWritingPrompts,
} from "@/hooks/useWritingPrompts";

export const Route = createFileRoute("/writing-prompts")({
  component: WritingPromptsPage,
});

function WritingPromptsPage() {
  const {
    data: prompts, isLoading, error,
  } = useWritingPrompts();
  const updatePrompt = useUpdateWritingPrompt();
  const deletePrompt = useDeleteWritingPrompt();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (prompts ?? []).filter((p) => {
      if (!q) return true;
      return p.title.toLowerCase().includes(q) || p.text.toLowerCase().includes(q);
    });
  }, [prompts, search]);

  const nothing = !isLoading && shown.length === 0;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Writing Prompts</h1>
          <p className="text-sm text-muted-foreground">
            Save reusable prompts to spark a free-write. When you start a new My Writing entry you can
            pull one up to write against.
          </p>
        </div>
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
            onSave={input => updatePrompt.mutate({
              id: prompt.id,
              input,
            })}
            onDelete={id => deletePrompt.mutate(id)}
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
  const [text, setText] = useState("");

  const submit = () => {
    const nextTitle = title.trim();
    const nextText = text.trim();
    if (!nextTitle || !nextText) return;
    createPrompt.mutate(
      {
        title: nextTitle,
        text: nextText,
      },
      {
        onSuccess: onDone,
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-sm">Title</Label>
        <Input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="A short label, e.g. “Morning routine”"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm">Prompt</Label>
        <Textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="What to write about…"
          rows={4}
        />
      </div>
      <div className="flex justify-end">
        <Button
          onClick={submit}
          disabled={!title.trim() || !text.trim() || createPrompt.isPending}
        >
          Add prompt
        </Button>
      </div>
    </div>
  );
}

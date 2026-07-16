import type { WritingPromptDifficulty } from "@sentence-bank/types";

import { useState } from "react";

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { DifficultySelect } from "@/components/DifficultySelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  useDeleteWritingPrompt,
  useUpdateWritingPrompt,
  useWritingPrompt,
} from "@/hooks/useWritingPrompts";

export const Route = createFileRoute("/writing-prompts/$id")({
  component: EditWritingPromptPage,
});

function EditWritingPromptPage() {
  usePageTitle("Edit prompt");
  const {
    id,
  } = Route.useParams();
  const {
    data, isLoading, error,
  } = useWritingPrompt(id);

  if (isLoading) return <p className="text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-destructive">{error.message}</p>;
  if (!data) return <p className="text-muted-foreground">Prompt not found.</p>;

  return (
    <EditWritingPromptForm
      key={data.id}
      prompt={data}
    />
  );
}

function EditWritingPromptForm({
  prompt,
}: {
  prompt: {
    id: string;
    title: string | null;
    titleEn: string | null;
    text: string;
    textEn: string | null;
    difficulty: WritingPromptDifficulty;
  };
}) {
  const navigate = useNavigate();
  const updatePrompt = useUpdateWritingPrompt();
  const deletePrompt = useDeleteWritingPrompt();

  const [title, setTitle] = useState(prompt.title ?? "");
  const [titleEn, setTitleEn] = useState(prompt.titleEn ?? "");
  const [text, setText] = useState(prompt.text);
  const [textEn, setTextEn] = useState(prompt.textEn ?? "");
  const [difficulty, setDifficulty] = useState<WritingPromptDifficulty>(prompt.difficulty);

  const toList = () => navigate({
    to: "/writing-prompts",
  });

  const save = () => {
    const nextText = text.trim();
    if (!nextText) return;
    updatePrompt.mutate(
      {
        id: prompt.id,
        input: {
          title: title.trim() || null,
          titleEn: titleEn.trim() || null,
          text: nextText,
          textEn: textEn.trim() || null,
          difficulty,
        },
      },
      {
        onSuccess: toList,
      },
    );
  };

  const remove = () => {
    deletePrompt.mutate(prompt.id, {
      onSuccess: toList,
    });
  };

  return (
    <section className="max-w-3xl space-y-6">
      <Button
        asChild
        variant="ghost"
        size="sm"
      >
        <Link to="/writing-prompts">
          <ArrowLeft className="size-4" />
          Back to prompts
        </Link>
      </Button>

      <div>
        <p className="text-sm text-muted-foreground">
          Update the titles, the Japanese and English versions, or the difficulty tag.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-sm">Japanese title</Label>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="日本語のタイトル（任意）…"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">English title</Label>
          <Input
            value={titleEn}
            onChange={e => setTitleEn(e.target.value)}
            placeholder="English title (optional)…"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">Japanese</Label>
          <Textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="日本語のプロンプト…"
            rows={3}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">English</Label>
          <Textarea
            value={textEn}
            onChange={e => setTextEn(e.target.value)}
            placeholder="English version (optional)…"
            rows={3}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm">Difficulty</Label>
          <DifficultySelect
            value={difficulty}
            onChange={setDifficulty}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button
          onClick={save}
          disabled={!text.trim() || updatePrompt.isPending}
        >
          Save
        </Button>
        <Button
          variant="destructive"
          onClick={remove}
          disabled={deletePrompt.isPending}
        >
          Delete
        </Button>
      </div>
    </section>
  );
}

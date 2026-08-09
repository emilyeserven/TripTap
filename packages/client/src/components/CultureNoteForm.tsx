import type { CultureNote, IconKey } from "@sentence-bank/types";

import { useState } from "react";

import { ICON_KEYS } from "@sentence-bank/types";

import { CultureTopicPicker } from "./CultureTopicPicker";

import { AiLessonIcon } from "@/components/ai-lesson/icon-map";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateCultureNote, useUpdateCultureNote } from "@/hooks/useCultureNotes";

// Radix Select forbids empty-string values, hence the sentinel (the NewDrillReasonForm pattern).
const NO_ICON = "__none";

/**
 * Create/edit form for a culture note. One component powers both the new and edit pages — pass a
 * `note` to edit an existing one. Everything is optional except one body in either language,
 * mirroring the server rule.
 */
export function CultureNoteForm({
  note,
  onSuccess,
}: {
  note?: CultureNote;
  onSuccess?: (id: string) => void;
}) {
  const create = useCreateCultureNote();
  const update = useUpdateCultureNote();
  const editing = note !== undefined;

  const [titleJp, setTitleJp] = useState(note?.titleJp ?? "");
  const [titleEn, setTitleEn] = useState(note?.titleEn ?? "");
  const [bodyJa, setBodyJa] = useState(note?.bodyJa ?? "");
  const [bodyEn, setBodyEn] = useState(note?.bodyEn ?? "");
  const [icon, setIcon] = useState<string>(note?.icon ?? NO_ICON);
  const [terms, setTerms] = useState(note?.terms.join(", ") ?? "");
  const [topicIds, setTopicIds] = useState<string[]>(note?.topicIds ?? []);

  const pending = create.isPending || update.isPending;
  const hasBody = bodyJa.trim().length > 0 || bodyEn.trim().length > 0;
  const canSubmit = hasBody && !pending;

  const submit = async () => {
    if (!canSubmit) return;
    const input = {
      titleJp: titleJp.trim() || null,
      titleEn: titleEn.trim() || null,
      bodyJa: bodyJa.trim() || null,
      bodyEn: bodyEn.trim() || null,
      icon: icon === NO_ICON ? null : icon as IconKey,
      terms: terms.split(/[,、]/).map(t => t.trim()).filter(Boolean),
      topicIds,
    };
    const saved = editing
      ? await update.mutateAsync({
        id: note.id,
        input,
      })
      : await create.mutateAsync(input);
    onSuccess?.(saved.id);
  };

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div
        className="
          grid gap-4
          sm:grid-cols-2
        "
      >
        <div className="space-y-1.5">
          <Label htmlFor="culture-note-body-ja">Japanese</Label>
          <Textarea
            id="culture-note-body-ja"
            lang="ja"
            value={bodyJa}
            onChange={e => setBodyJa(e.target.value)}
            placeholder="麺をすするのは失礼ではありません。"
            rows={4}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="culture-note-body-en">English</Label>
          <Textarea
            id="culture-note-body-en"
            value={bodyEn}
            onChange={e => setBodyEn(e.target.value)}
            placeholder="Slurping your noodles isn't rude — it shows you're enjoying them."
            rows={4}
          />
        </div>
      </div>
      {!hasBody && (
        <p className="text-xs text-muted-foreground">
          Write the note in Japanese, English, or both — even one sentence is fine.
        </p>
      )}

      <div
        className="
          grid gap-4
          sm:grid-cols-2
        "
      >
        <div className="space-y-1.5">
          <Label htmlFor="culture-note-title-jp">Japanese heading (optional)</Label>
          <Input
            id="culture-note-title-jp"
            lang="ja"
            value={titleJp}
            onChange={e => setTitleJp(e.target.value)}
            placeholder="食事のマナー"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="culture-note-title-en">English heading (optional)</Label>
          <Input
            id="culture-note-title-en"
            value={titleEn}
            onChange={e => setTitleEn(e.target.value)}
            placeholder="Table manners"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Topics</Label>
        <CultureTopicPicker
          value={topicIds}
          onChange={setTopicIds}
        />
      </div>

      <div
        className="
          grid gap-4
          sm:grid-cols-2
        "
      >
        <div className="space-y-1.5">
          <Label htmlFor="culture-note-icon">Icon (optional)</Label>
          <Select
            value={icon}
            onValueChange={setIcon}
          >
            <SelectTrigger
              id="culture-note-icon"
              className="w-full"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_ICON}>No icon</SelectItem>
              {ICON_KEYS.map(key => (
                <SelectItem
                  key={key}
                  value={key}
                >
                  <AiLessonIcon
                    name={key}
                    className="size-4"
                  />
                  {key}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="culture-note-terms">Vocab terms (optional)</Label>
          <Input
            id="culture-note-terms"
            lang="ja"
            value={terms}
            onChange={e => setTerms(e.target.value)}
            placeholder="すする、麺"
          />
          <p className="text-xs text-muted-foreground">
            Comma-separated; terms matching AI-Lesson vocab become hover chips.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="submit"
          disabled={!canSubmit}
        >
          {pending
            ? "Saving…"
            : editing
              ? "Save changes"
              : "Create note"}
        </Button>
      </div>
    </form>
  );
}

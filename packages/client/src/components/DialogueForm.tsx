import type { Dialogue, DialogueLine, LearningArea } from "@sentence-bank/types";

import { useState } from "react";

import { dialogueSpeakers, isSelfSpeaker, LEARNING_AREAS, reconcileDialogueLines } from "@sentence-bank/types";

import { DialogueTranscript } from "@/components/DialogueTranscript";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useCreateDialogue, useUpdateDialogue } from "@/hooks/useDialogues";
import { todayDateString } from "@/lib/daily-lineup";
import { speakerAccent } from "@/lib/dialogue";
import { cn } from "@/lib/utils";

/**
 * Create/edit form for a dialogue. Passing `dialogue` puts it in edit mode.
 *
 * The script box is the whole feature: everything below it — the speaker list, the "these are me"
 * toggles, the transcript preview, the per-line translation boxes — is derived from what's typed,
 * live, using the same reconciler the API runs on save. So what the learner sees while typing is
 * exactly what gets stored.
 */
export function DialogueForm({
  dialogue,
  onSuccess,
}: {
  dialogue?: Dialogue;
  onSuccess?: (id: string) => void;
}) {
  const create = useCreateDialogue();
  const update = useUpdateDialogue();
  const editing = dialogue !== undefined;

  const [date, setDate] = useState(dialogue?.date ?? todayDateString(new Date()));
  const [title, setTitle] = useState(dialogue?.title ?? "");
  const [language, setLanguage] = useState(dialogue?.language ?? "Japanese");
  const [script, setScript] = useState(dialogue?.script ?? "");
  const [selfSpeakers, setSelfSpeakers] = useState<string[]>(dialogue?.selfSpeakers ?? []);
  const [countsTowardXp, setCountsTowardXp] = useState(dialogue?.countsTowardXp ?? false);
  const [learningArea, setLearningArea] = useState<LearningArea>(
    dialogue?.learningArea ?? "Speaking",
  );
  // The parsed lines are held as state rather than derived on every render, so a line keeps its id —
  // and therefore its translation — while the script around it is being edited.
  const [lines, setLines] = useState<DialogueLine[]>(dialogue?.lines ?? []);
  const speakers = dialogueSpeakers(lines);

  const editScript = (next: string) => {
    setScript(next);
    setLines(prev => reconcileDialogueLines(next, prev, () => crypto.randomUUID()));
  };

  const editTranslation = (id: string, value: string) => {
    setLines(prev =>
      prev.map(line =>
        (line.id === id
          ? {
            ...line,
            translation: value.trim().length > 0 ? value : null,
          }
          : line)));
  };

  const pending = create.isPending || update.isPending;
  const canSubmit = title.trim().length > 0 && script.trim().length > 0 && !pending;

  const toggleSelf = (speaker: string) => {
    setSelfSpeakers(prev =>
      prev.includes(speaker) ? prev.filter(s => s !== speaker) : [...prev, speaker]);
  };

  const submit = async () => {
    if (!canSubmit) return;
    const input = {
      date,
      title: title.trim(),
      language: language.trim() || "Japanese",
      script,
      lines,
      selfSpeakers: selfSpeakers.length > 0 ? selfSpeakers : null,
      countsTowardXp,
      learningArea: countsTowardXp ? learningArea : null,
    };
    const saved = editing
      ? await update.mutateAsync({
        id: dialogue.id,
        input,
      })
      : await create.mutateAsync(input);
    onSuccess?.(saved.id);
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div
        className="
          space-y-1.5
          sm:max-w-xs
        "
      >
        <Label htmlFor="dlg-date">Date</Label>
        <Input
          id="dlg-date"
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="dlg-title">Title</Label>
        <Input
          id="dlg-title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Genki L3 — meeting a coworker"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="dlg-script">Script</Label>
        <Textarea
          id="dlg-script"
          value={script}
          onChange={e => editScript(e.target.value)}
          rows={10}
          className="font-mono"
          placeholder={"田中さん：こんにちは、元気ですか？\n私：はい、元気です。"}
        />
        <p className="text-xs text-muted-foreground">
          One line per utterance, as
          {" "}
          <code className="rounded-sm bg-muted px-1 py-0.5">speaker：line</code>
          . Both
          {" "}
          <code className="rounded-sm bg-muted px-1 py-0.5">：</code>
          {" "}
          and
          {" "}
          <code className="rounded-sm bg-muted px-1 py-0.5">:</code>
          {" "}
          work. A line with no speaker continues the one above it.
        </p>
      </div>

      {speakers.length > 0 && (
        <div className="space-y-2 rounded-md border p-3">
          <p className="text-sm font-medium">Speakers</p>
          <p className="text-xs text-muted-foreground">
            &ldquo;私&rdquo; and &ldquo;Me&rdquo; always appear on the right. Tick anyone else who is
            also you.
          </p>
          <div className="flex flex-wrap gap-2">
            {speakers.map((speaker) => {
              const always = isSelfSpeaker(speaker);
              const self = isSelfSpeaker(speaker, selfSpeakers);
              return (
                <button
                  key={speaker}
                  type="button"
                  disabled={always}
                  aria-pressed={self}
                  onClick={() => toggleSelf(speaker)}
                  className={cn(
                    `
                      inline-flex items-center gap-1.5 rounded-full border
                      px-2.5 py-1 text-xs font-medium transition-colors
                      focus-visible:ring-2 focus-visible:ring-ring
                      focus-visible:outline-none
                      disabled:cursor-default
                    `,
                    self
                      ? "border-transparent bg-primary text-primary-foreground"
                      : "border-border",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "size-2 rounded-full",
                      self ? "bg-primary-foreground" : speakerAccent(speaker),
                    )}
                  />
                  {speaker}
                  {self && <span className="opacity-80">(me)</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-2 rounded-md border p-3">
        <label className="flex items-start gap-2">
          <Checkbox
            checked={countsTowardXp}
            onCheckedChange={next => setCountsTowardXp(next === true)}
            aria-label="This dialogue counts toward XP"
          />
          <span className="space-y-0.5">
            <span className="block text-sm font-medium">I wrote this myself — counts toward XP</span>
            <span className="block text-xs text-muted-foreground">
              Leave off for a dialogue you sourced from a textbook or a lesson: it&rsquo;s worth
              studying, but you didn&rsquo;t produce it, so it shouldn&rsquo;t earn anything.
            </span>
          </span>
        </label>
        {countsTowardXp && (
          <div
            className="
              space-y-1.5 pl-6
              sm:max-w-xs
            "
          >
            <Label htmlFor="dlg-area">Learning area</Label>
            <Select
              value={learningArea}
              onValueChange={next => setLearningArea(next as LearningArea)}
            >
              <SelectTrigger id="dlg-area">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEARNING_AREAS.map(area => (
                  <SelectItem
                    key={area}
                    value={area}
                  >
                    {area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div
        className="
          space-y-1.5
          sm:max-w-xs
        "
      >
        <Label htmlFor="dlg-language">Language</Label>
        <Input
          id="dlg-language"
          value={language}
          onChange={e => setLanguage(e.target.value)}
        />
      </div>

      {lines.length > 0 && (
        <>
          <div className="space-y-2">
            <p className="text-sm font-medium">Preview</p>
            <div className="rounded-md border p-4">
              <DialogueTranscript
                lines={lines}
                selfSpeakers={selfSpeakers}
                showTranslations
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Translations</p>
            <p className="text-xs text-muted-foreground">
              Optional. Each one stays attached to its line as you edit the script above.
            </p>
            <div className="space-y-2">
              {lines.map(line => (
                <div
                  key={line.id}
                  className="
                    grid gap-1
                    sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:items-center
                    sm:gap-3
                  "
                >
                  <span className="truncate text-sm">
                    <span className="text-muted-foreground">{line.speaker ?? "—"}</span>
                    {" "}
                    {line.text}
                  </span>
                  <Input
                    value={line.translation ?? ""}
                    aria-label={`Translation for "${line.text}"`}
                    placeholder="English"
                    onChange={e => editTranslation(line.id, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="flex items-center gap-2">
        <Button
          type="submit"
          disabled={!canSubmit}
        >
          {pending
            ? "Saving…"
            : editing
              ? "Save changes"
              : "Create dialogue"}
        </Button>
      </div>
    </form>
  );
}

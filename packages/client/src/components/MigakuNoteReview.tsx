import type {
  MigakuCandidate,
  MigakuDedupAction,
  MigakuImageTarget,
  MigakuImportDetail,
  MigakuNoteGroup,
} from "@sentence-bank/types";

import { useMemo, useState } from "react";

import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { MigakuReadingPreview } from "@/components/MigakuReadingPreview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useCommitMigakuImport, useDeleteMigakuImport } from "@/hooks/useMigakuImports";
import { migakuImportsApi } from "@/lib/api";

/** Per-candidate edit state (a vocab or one sentence). */
interface ItemState {
  include: boolean;
  text: string;
  meaning: string;
  notes: string;
  dedupAction: MigakuDedupAction;
}

/** Per-note-group state: whether to link the word↔sentence(s) and where the image lands. */
interface GroupState {
  link: boolean;
  imageTarget: MigakuImageTarget;
}

function initItem(c: MigakuCandidate): ItemState {
  return {
    // Duplicates start deselected; the dedup action defaults to linking to the existing row.
    include: !c.alreadyExists,
    text: c.text,
    meaning: c.meaning ?? "",
    notes: c.notes ?? "",
    dedupAction: "link",
  };
}

/** A small audio player for a candidate's word/sentence audio. */
function AudioPlayer({
  importId,
  candidateId,
}: { importId: string;
  candidateId: string; }) {
  return (
    <audio
      controls
      preload="none"
      src={migakuImportsApi.mediaUrl(importId, candidateId, "audio")}
      className="h-8"
    >
      <track kind="captions" />
    </audio>
  );
}

/** A duplicate-handling picker, shown only when the row already matches a bank entry. */
function DedupPicker({
  value,
  onChange,
}: { value: MigakuDedupAction;
  onChange: (v: MigakuDedupAction) => void; }) {
  return (
    <Select
      value={value}
      onValueChange={v => onChange(v as MigakuDedupAction)}
    >
      <SelectTrigger className="h-8 w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="link">Link to existing</SelectItem>
        <SelectItem value="skip">Skip</SelectItem>
        <SelectItem value="new">Create new</SelectItem>
      </SelectContent>
    </Select>
  );
}

/** The focus-word (vocab) block of a note group. */
function VocabBlock({
  importId,
  candidate,
  state,
  onChange,
}: {
  importId: string;
  candidate: MigakuCandidate;
  state: ItemState;
  onChange: (patch: Partial<ItemState>) => void;
}) {
  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Checkbox
          checked={state.include}
          onCheckedChange={v => onChange({
            include: v === true,
          })}
          aria-label="Include this word"
        />
        <Badge>Word</Badge>
        {candidate.alreadyExists
          ? <Badge variant="secondary">Already in bank</Badge>
          : null}
        {candidate.hasAudio
          ? (
            <AudioPlayer
              importId={importId}
              candidateId={candidate.id}
            />
          )
          : null}
        {candidate.alreadyExists
          ? (
            <DedupPicker
              value={state.dedupAction}
              onChange={v => onChange({
                dedupAction: v,
              })}
            />
          )
          : null}
      </div>

      <MigakuReadingPreview reading={candidate.reading} />

      <div
        className="
          grid gap-3
          sm:grid-cols-2
        "
      >
        <div className="space-y-1">
          <Label
            htmlFor={`term-${candidate.id}`}
            className="text-xs text-muted-foreground"
          >Term
          </Label>
          <Input
            id={`term-${candidate.id}`}
            value={state.text}
            onChange={e => onChange({
              text: e.target.value,
            })}
            lang="ja"
          />
        </div>
        <div className="space-y-1">
          <Label
            htmlFor={`meaning-${candidate.id}`}
            className="text-xs text-muted-foreground"
          >Meaning
          </Label>
          <Textarea
            id={`meaning-${candidate.id}`}
            value={state.meaning}
            onChange={e => onChange({
              meaning: e.target.value,
            })}
            rows={2}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label
          htmlFor={`notes-${candidate.id}`}
          className="text-xs text-muted-foreground"
        >Explanation (notes)
        </Label>
        <Textarea
          id={`notes-${candidate.id}`}
          value={state.notes}
          onChange={e => onChange({
            notes: e.target.value,
          })}
          rows={3}
        />
      </div>
    </div>
  );
}

/** One example-sentence block of a note group. */
function SentenceBlock({
  importId,
  candidate,
  state,
  onChange,
}: {
  importId: string;
  candidate: MigakuCandidate;
  state: ItemState;
  onChange: (patch: Partial<ItemState>) => void;
}) {
  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Checkbox
          checked={state.include}
          onCheckedChange={v => onChange({
            include: v === true,
          })}
          aria-label="Include this sentence"
        />
        <Badge variant="outline">Sentence</Badge>
        {candidate.alreadyExists
          ? <Badge variant="secondary">Already in bank</Badge>
          : null}
        {candidate.hasAudio
          ? (
            <AudioPlayer
              importId={importId}
              candidateId={candidate.id}
            />
          )
          : null}
        {candidate.alreadyExists
          ? (
            <DedupPicker
              value={state.dedupAction}
              onChange={v => onChange({
                dedupAction: v,
              })}
            />
          )
          : null}
      </div>

      <MigakuReadingPreview reading={candidate.reading} />

      <div
        className="
          grid gap-3
          sm:grid-cols-2
        "
      >
        <div className="space-y-1">
          <Label
            htmlFor={`text-${candidate.id}`}
            className="text-xs text-muted-foreground"
          >Sentence
          </Label>
          <Input
            id={`text-${candidate.id}`}
            value={state.text}
            onChange={e => onChange({
              text: e.target.value,
            })}
            lang="ja"
          />
        </div>
        <div className="space-y-1">
          <Label
            htmlFor={`translation-${candidate.id}`}
            className="text-xs text-muted-foreground"
          >Translation
          </Label>
          <Input
            id={`translation-${candidate.id}`}
            value={state.meaning}
            onChange={e => onChange({
              meaning: e.target.value,
            })}
          />
        </div>
      </div>
    </div>
  );
}

/** The review-and-commit workbench for a Migaku-model import — grouped word + sentence(s) per note. */
export function MigakuNoteReview({
  detail,
}: { detail: MigakuImportDetail }) {
  const navigate = useNavigate();
  const commit = useCommitMigakuImport();
  const discard = useDeleteMigakuImport();
  const [language, setLanguage] = useState("Japanese");
  const [deckName, setDeckName] = useState(detail.deckName);

  const byId = useMemo(
    () => new Map(detail.candidates.map(c => [c.id, c])),
    [detail.candidates],
  );

  const [items, setItems] = useState<Record<string, ItemState>>(() =>
    Object.fromEntries(detail.candidates.map(c => [c.id, initItem(c)])));
  const [groupStates, setGroupStates] = useState<Record<string, GroupState>>(() =>
    Object.fromEntries(detail.noteGroups.map(g => [g.id, {
      link: true,
      imageTarget: g.hasImage ? "sentence" : "none",
    }])));

  const updateItem = (id: string, patch: Partial<ItemState>) =>
    setItems(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        ...patch,
      },
    }));
  const updateGroup = (id: string, patch: Partial<GroupState>) =>
    setGroupStates(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        ...patch,
      },
    }));

  const selectedCount = useMemo(
    () => Object.values(items).filter(r => r.include).length,
    [items],
  );

  function handleCommit() {
    commit.mutate({
      id: detail.id,
      input: {
        language: language.trim() || "Japanese",
        deckName: deckName.trim() || detail.deckName,
        items: detail.candidates.map((c) => {
          const r = items[c.id];
          return {
            id: c.id,
            include: r.include,
            kind: c.kind,
            text: r.text,
            meaning: r.meaning.trim() ? r.meaning : null,
            notes: c.kind === "vocab" && r.notes.trim() ? r.notes : null,
            tags: c.tags,
            dedupAction: r.dedupAction,
          };
        }),
        groups: detail.noteGroups.map(g => ({
          id: g.id,
          link: groupStates[g.id].link,
          imageTarget: groupStates[g.id].imageTarget,
        })),
      },
    }, {
      onSuccess: (result) => {
        const skipped = result.skipped ? ` · skipped ${result.skipped}` : "";
        toast.success(
          `Imported ${result.sentencesCreated} sentence(s), ${result.vocabCreated} word(s), `
          + `${result.linksCreated} link(s)${skipped}`,
        );
        navigate({
          to: "/migaku-import",
        });
      },
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="migaku-deck">Deck name</Label>
          <Input
            id="migaku-deck"
            value={deckName}
            onChange={e => setDeckName(e.target.value)}
            className="max-w-56"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="migaku-language">Language for imported items</Label>
          <Input
            id="migaku-language"
            value={language}
            onChange={e => setLanguage(e.target.value)}
            className="max-w-48"
          />
        </div>
      </div>

      <div className="space-y-4">
        {detail.noteGroups.map((group: MigakuNoteGroup) => {
          const vocab = group.vocabId ? byId.get(group.vocabId) : undefined;
          const sentences = group.sentenceIds.map(id => byId.get(id)).filter(Boolean) as MigakuCandidate[];
          const imageCandidate = sentences.find(s => s.hasImage);
          const gState = groupStates[group.id];
          return (
            <Card
              key={group.id}
              className="space-y-3 p-4"
            >
              {vocab
                ? (
                  <VocabBlock
                    importId={detail.id}
                    candidate={vocab}
                    state={items[vocab.id]}
                    onChange={patch => updateItem(vocab.id, patch)}
                  />
                )
                : null}

              {sentences.map(s => (
                <SentenceBlock
                  key={s.id}
                  importId={detail.id}
                  candidate={s}
                  state={items[s.id]}
                  onChange={patch => updateItem(s.id, patch)}
                />
              ))}

              <div className="flex flex-wrap items-center gap-4">
                {vocab && sentences.length > 0
                  ? (
                    <label className="flex items-center gap-2 text-sm">
                      <Switch
                        checked={gState.link}
                        onCheckedChange={v => updateGroup(group.id, {
                          link: v,
                        })}
                      />
                      Link word ↔ sentence(s)
                    </label>
                  )
                  : null}

                {group.hasImage
                  ? (
                    <div className="flex items-center gap-2">
                      {imageCandidate
                        ? (
                          <img
                            src={migakuImportsApi.mediaUrl(detail.id, imageCandidate.id, "image")}
                            alt=""
                            className="max-h-16 rounded-sm border"
                          />
                        )
                        : null}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Image</Label>
                        <Select
                          value={gState.imageTarget}
                          onValueChange={v => updateGroup(group.id, {
                            imageTarget: v as MigakuImageTarget,
                          })}
                        >
                          <SelectTrigger className="h-8 w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sentence">On sentence</SelectItem>
                            <SelectItem value="vocab">On word</SelectItem>
                            <SelectItem value="both">On both</SelectItem>
                            <SelectItem value="none">Skip image</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )
                  : null}
              </div>
            </Card>
          );
        })}
      </div>

      <div
        className="
          sticky bottom-0 flex flex-wrap items-center justify-between gap-3
          border-t bg-background/95 py-3 backdrop-blur-sm
        "
      >
        <p className="text-sm text-muted-foreground">
          {selectedCount} of {detail.candidates.length} selected · {detail.noteGroups.length} note(s)
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            disabled={discard.isPending}
            onClick={() =>
              discard.mutate(detail.id, {
                onSuccess: () => navigate({
                  to: "/migaku-import",
                }),
              })}
          >
            Discard import
          </Button>
          <Button
            type="button"
            onClick={handleCommit}
            disabled={commit.isPending || selectedCount === 0}
          >
            {commit.isPending ? "Importing…" : `Import ${selectedCount} item(s)`}
          </Button>
        </div>
      </div>
    </div>
  );
}

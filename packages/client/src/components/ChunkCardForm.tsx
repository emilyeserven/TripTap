import type { ChunkCard, ChunkCardFormat } from "@sentence-bank/types";

import { useState } from "react";

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
import { useCreateChunkCard, useUpdateChunkCard } from "@/hooks/useRuleGroups";

const FORMAT_LABELS: Record<ChunkCardFormat, string> = {
  situation_production: "Situation → production",
  cloze: "Cloze",
};

/**
 * Create or edit a chunk card from a collocation (spec §7). The prompt/answer are what goes on the
 * card; `wrongForm` is kept for the log only and is explicitly labelled as never appearing on a face
 * (spec §6 inv.3). Creating enforces the per-batch volume cap server-side (spec §6 inv.2).
 */
export function ChunkCardForm({
  card,
  batchId,
  correctionId,
  defaultChunk,
  defaultWrongForm,
  onSaved,
  onCancel,
}: {
  card?: ChunkCard;
  batchId?: string;
  correctionId?: string | null;
  defaultChunk?: string;
  defaultWrongForm?: string;
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const create = useCreateChunkCard();
  const update = useUpdateChunkCard();
  const [chunk, setChunk] = useState(card?.chunk ?? defaultChunk ?? "");
  const [gloss, setGloss] = useState(card?.gloss ?? "");
  const [format, setFormat] = useState<ChunkCardFormat>(card?.format ?? "situation_production");
  const [prompt, setPrompt] = useState(card?.prompt ?? "");
  const [answer, setAnswer] = useState(card?.answer ?? defaultChunk ?? "");
  const [wrongForm, setWrongForm] = useState(card?.wrongForm ?? defaultWrongForm ?? "");

  const canSave = chunk.trim() && prompt.trim() && answer.trim();
  const pending = create.isPending || update.isPending;

  async function save() {
    if (!canSave) return;
    if (card) {
      await update.mutateAsync({
        id: card.id,
        input: {
          chunk: chunk.trim(),
          gloss: gloss.trim(),
          format,
          prompt: prompt.trim(),
          answer: answer.trim(),
          wrongForm: wrongForm.trim() || null,
        },
      });
    }
    else {
      if (!batchId) return;
      await create.mutateAsync({
        batchId,
        correctionId: correctionId ?? null,
        chunk: chunk.trim(),
        gloss: gloss.trim(),
        format,
        prompt: prompt.trim(),
        answer: answer.trim(),
        wrongForm: wrongForm.trim() || null,
      });
    }
    onSaved();
  }

  return (
    <div className="space-y-3">
      <div
        className="
          grid gap-3
          sm:grid-cols-2
        "
      >
        <div className="space-y-1.5">
          <Label htmlFor="chunk">Chunk</Label>
          <Input
            id="chunk"
            value={chunk}
            onChange={e => setChunk(e.target.value)}
            placeholder="お風呂に入る"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gloss">Gloss</Label>
          <Input
            id="gloss"
            value={gloss}
            onChange={e => setGloss(e.target.value)}
            placeholder="take a bath"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="chunk-format">Format</Label>
        <Select
          value={format}
          onValueChange={v => setFormat(v as ChunkCardFormat)}
        >
          <SelectTrigger
            id="chunk-format"
            className="w-64"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(FORMAT_LABELS) as ChunkCardFormat[]).map(f => (
              <SelectItem
                key={f}
                value={f}
              >
                {FORMAT_LABELS[f]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="chunk-prompt">
          Front {format === "situation_production" ? "(English situation)" : "(sentence with a blank)"}
        </Label>
        <Textarea
          id="chunk-prompt"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder={format === "situation_production"
            ? "Say that the light went out on its own."
            : "電気が ___ 。( 消す / 消える )"}
          rows={2}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="chunk-answer">Back (answer)</Label>
        <Input
          id="chunk-answer"
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          placeholder="お風呂に入る"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="chunk-wrong">Your wrong form (log only)</Label>
        <Input
          id="chunk-wrong"
          value={wrongForm}
          onChange={e => setWrongForm(e.target.value)}
          placeholder="お風呂を浴びる"
        />
        <p className="text-xs text-muted-foreground">
          Stored for the log — never shown on a card face, so review can’t rehearse the mistake.
        </p>
      </div>

      <div className="flex justify-end gap-2">
        {onCancel
          ? (
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
            >
              Cancel
            </Button>
          )
          : null}
        <Button
          type="button"
          onClick={save}
          disabled={!canSave || pending}
        >
          {card ? "Save card" : "Create card"}
        </Button>
      </div>
    </div>
  );
}

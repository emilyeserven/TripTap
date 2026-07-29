import type { CorrectionSource } from "@sentence-bank/types";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateCorrection } from "@/hooks/useCorrections";

const SOURCE_LABELS: Record<CorrectionSource, string> = {
  tutor: "Tutor",
  native_speaker: "Native speaker",
  app: "App checker",
  self: "Self",
};

/**
 * Paste-in capture for a batch of corrections. Corrections arrive in batches (one tutoring session,
 * one set of native-speaker fixes), so this form keeps a single `batchId` across adds until the
 * learner starts a new batch — the batch is what the per-batch volume cap counts against later.
 */
export function CorrectionCaptureForm() {
  const create = useCreateCorrection();
  const [batchId, setBatchId] = useState(() => crypto.randomUUID());
  const [added, setAdded] = useState(0);
  const [original, setOriginal] = useState("");
  const [corrected, setCorrected] = useState("");
  const [note, setNote] = useState("");
  const [context, setContext] = useState("");
  const [source, setSource] = useState<CorrectionSource>("tutor");

  const canSubmit = original.trim().length > 0 && corrected.trim().length > 0;

  async function handleAdd() {
    if (!canSubmit) return;
    await create.mutateAsync({
      original: original.trim(),
      corrected: corrected.trim(),
      correctorNote: note.trim() || null,
      context: context.trim() || null,
      source,
      batchId,
    });
    setAdded(n => n + 1);
    setOriginal("");
    setCorrected("");
    setNote("");
    setContext("");
  }

  function startNewBatch() {
    setBatchId(crypto.randomUUID());
    setAdded(0);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Capture corrections</CardTitle>
        <CardDescription>
          Paste a correction — what you wrote, and the fix. Add the whole batch, then triage it. Most
          will turn out to be slips and get thrown away; that’s the point.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className="
            grid gap-4
            sm:grid-cols-2
          "
        >
          <div className="space-y-1.5">
            <Label htmlFor="correction-original">What you wrote</Label>
            <Textarea
              id="correction-original"
              value={original}
              onChange={e => setOriginal(e.target.value)}
              placeholder="学校え行きました"
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="correction-corrected">The fix</Label>
            <Textarea
              id="correction-corrected"
              value={corrected}
              onChange={e => setCorrected(e.target.value)}
              placeholder="学校へ行きました"
              rows={2}
            />
          </div>
        </div>

        <div
          className="
            grid gap-4
            sm:grid-cols-2
          "
        >
          <div className="space-y-1.5">
            <Label htmlFor="correction-note">Corrector’s note (optional)</Label>
            <Textarea
              id="correction-note"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Typing slip on え/へ"
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="correction-context">Context / prompt (optional)</Label>
            <Textarea
              id="correction-context"
              value={context}
              onChange={e => setContext(e.target.value)}
              placeholder="Prompt or surrounding sentence"
              rows={2}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="correction-source">Source</Label>
            <Select
              value={source}
              onValueChange={v => setSource(v as CorrectionSource)}
            >
              <SelectTrigger
                id="correction-source"
                className="w-48"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SOURCE_LABELS) as CorrectionSource[]).map(key => (
                  <SelectItem
                    key={key}
                    value={key}
                  >
                    {SOURCE_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {added} added this batch
            </span>
            {added > 0
              ? (
                <Button
                  variant="ghost"
                  onClick={startNewBatch}
                  disabled={create.isPending}
                >
                  Start new batch
                </Button>
              )
              : null}
            <Button
              onClick={handleAdd}
              disabled={!canSubmit || create.isPending}
            >
              Add to batch
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

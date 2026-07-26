import { useState } from "react";

import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** The fields an inline correction save writes back. `needsCorrection` is only sent for lines. */
export interface CorrectionPatch {
  correction: string | null;
  note: string | null;
  needsCorrection?: boolean;
}

/**
 * Inline "record a corrected translation + a comment" editor, used directly on the read-only
 * reading-session view so the learner can correct a translation without opening the edit form.
 * Collapsed to a small "Add correction" button until there's something to show or the user opens it.
 * Pass `needsCorrection` (a boolean) to include the line-level "needs correction" toggle; omit it
 * (undefined) for the freeform translation, which has no such flag.
 */
export function ReadingCorrectionEditor({
  correction,
  note,
  needsCorrection,
  correctionLabel = "Corrected translation",
  onSave,
}: {
  correction: string | null;
  note: string | null;
  needsCorrection?: boolean;
  correctionLabel?: string;
  onSave: (patch: CorrectionPatch) => Promise<void>;
}) {
  const hasFlag = needsCorrection !== undefined;
  const [c, setC] = useState(correction ?? "");
  const [n, setN] = useState(note ?? "");
  const [flag, setFlag] = useState(needsCorrection ?? false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(
    Boolean(correction || note || needsCorrection),
  );

  const dirty
    = c !== (correction ?? "")
      || n !== (note ?? "")
      || (hasFlag && flag !== (needsCorrection ?? false));

  const save = async () => {
    setSaving(true);
    try {
      await onSave({
        correction: c.trim() || null,
        note: n.trim() || null,
        ...(hasFlag
          ? {
            needsCorrection: flag,
          }
          : {}),
      });
    }
    finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Pencil className="size-4" />
        Add correction
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-dashed p-3">
      {hasFlag && (
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={flag}
            onCheckedChange={v => setFlag(v === true)}
          />
          Needs correction
        </label>
      )}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">{correctionLabel}</Label>
        <Textarea
          value={c}
          onChange={e => setC(e.target.value)}
          placeholder="The corrected translation"
          rows={2}
          aria-label="Corrected translation"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Comment</Label>
        <Textarea
          value={n}
          onChange={e => setN(e.target.value)}
          placeholder="A note on the translation — what was off and why."
          rows={2}
          aria-label="Translation comment"
        />
      </div>
      <Button
        type="button"
        size="sm"
        onClick={() => void save()}
        disabled={!dirty || saving}
      >
        {saving ? "Saving…" : "Save correction"}
      </Button>
    </div>
  );
}

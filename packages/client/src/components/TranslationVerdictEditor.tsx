import type { TranslationVerdict } from "@sentence-bank/types";

import { useState } from "react";

import { TranslationVerdictPicker } from "@/components/TranslationVerdictPicker";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/** The fields an inline verdict save writes back to a line or the freeform translation. */
export interface VerdictPatch {
  verdict: TranslationVerdict | null;
  note: string | null;
}

/**
 * Inline self-assessment for a translation on the read-only reading-session view: shows the reference
 * translation (read-only — it's authored on the edit page), lets the learner record a verdict
 * (correct / partial / incorrect), and jot a comment. The comment box appears once a verdict is set or
 * a note already exists, keeping unassessed lines compact. Saves via the caller's `onSave`.
 */
export function TranslationVerdictEditor({
  referenceTranslation,
  verdict,
  note,
  onSave,
}: {
  referenceTranslation: string | null;
  verdict: TranslationVerdict | null;
  note: string | null;
  onSave: (patch: VerdictPatch) => Promise<void>;
}) {
  const [v, setV] = useState<TranslationVerdict | null>(verdict);
  const [n, setN] = useState(note ?? "");
  const [saving, setSaving] = useState(false);

  const dirty = v !== verdict || n !== (note ?? "");
  const showComment = v !== null || n.length > 0;

  const save = async () => {
    setSaving(true);
    try {
      await onSave({
        verdict: v,
        note: n.trim() || null,
      });
    }
    finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2 pt-1">
      {referenceTranslation
        ? (
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-muted-foreground">Reference translation</p>
            <p className="text-sm whitespace-pre-wrap">{referenceTranslation}</p>
          </div>
        )
        : null}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">How did you do?</span>
        <TranslationVerdictPicker
          value={v}
          onChange={setV}
        />
      </div>
      {showComment
        ? (
          <Textarea
            value={n}
            onChange={e => setN(e.target.value)}
            placeholder="Comment on your translation (optional)"
            rows={2}
            aria-label="Translation comment"
          />
        )
        : null}
      {dirty
        ? (
          <Button
            type="button"
            size="sm"
            onClick={() => void save()}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        )
        : null}
    </div>
  );
}

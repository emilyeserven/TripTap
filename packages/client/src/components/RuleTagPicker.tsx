import type { ComboboxOption } from "@/components/ui/combobox";
import type { RuleTag } from "@sentence-bank/types";

import { useMemo, useState } from "react";

import { ruleTagKeyFromLabel } from "@sentence-bank/types";

import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRuleTags } from "@/hooks/useCorrections";
import { useGrammarNotes } from "@/hooks/useGrammarNotes";

/** The rule-tag selection a triage produces: an existing tag or a new one, with an optional link. */
export interface RuleTagSelection {
  key: string;
  label: string;
  grammarTagId: string | null;
  grammarTagName: string | null;
}

const NEW_TAG = "__new__";

/**
 * Create-or-select a rule tag for a rule-gap triage (spec §4, §5). Pick an existing tag (which
 * carries its own grammar link), or name a new one and optionally link it to a grammar note — the
 * link (`grammarTagId` → `GrammarNote.tagId`) is what surfaces the failure badge on that note.
 */
export function RuleTagPicker({
  onChange,
}: {
  onChange: (selection: RuleTagSelection | null) => void;
}) {
  const {
    data: ruleTags,
  } = useRuleTags();
  const {
    data: grammarNotes,
  } = useGrammarNotes();
  const [mode, setMode] = useState<string>(NEW_TAG);
  const [newLabel, setNewLabel] = useState("");
  const [grammarTagId, setGrammarTagId] = useState<string>("");

  const tagOptions: ComboboxOption[] = useMemo(() => {
    const existing = (ruleTags ?? []).map(t => ({
      value: t.key,
      label: t.label,
    }));
    return [{
      value: NEW_TAG,
      label: "＋ New rule tag…",
    }, ...existing];
  }, [ruleTags]);

  const grammarOptions: ComboboxOption[] = useMemo(() => {
    const notes = (grammarNotes ?? []).map(n => ({
      value: n.tagId,
      label: n.nuance ? `${n.title} — ${n.nuance}` : n.title,
    }));
    return [{
      value: "",
      label: "No grammar link",
    }, ...notes];
  }, [grammarNotes]);

  function emit(nextMode: string, label: string, gTagId: string) {
    if (nextMode !== NEW_TAG) {
      const tag = (ruleTags ?? []).find((t: RuleTag) => t.key === nextMode);
      onChange(
        tag
          ? {
            key: tag.key,
            label: tag.label,
            grammarTagId: tag.grammarTagId,
            grammarTagName: tag.grammarTagName,
          }
          : null,
      );
      return;
    }
    const trimmed = label.trim();
    if (!trimmed) {
      onChange(null);
      return;
    }
    const note = (grammarNotes ?? []).find(n => n.tagId === gTagId);
    onChange({
      key: ruleTagKeyFromLabel(trimmed),
      label: trimmed,
      grammarTagId: gTagId || null,
      grammarTagName: note?.tagName ?? null,
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label>Rule tag</Label>
        <Combobox
          value={mode}
          onChange={(v) => {
            setMode(v);
            emit(v, newLabel, grammarTagId);
          }}
          options={tagOptions}
          placeholder="Select or create a rule tag"
          ariaLabel="Rule tag"
        />
      </div>

      {mode === NEW_TAG
        ? (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="rule-tag-label">New tag name</Label>
              <Input
                id="rule-tag-label"
                autoFocus
                value={newLabel}
                onChange={(e) => {
                  setNewLabel(e.target.value);
                  emit(NEW_TAG, e.target.value, grammarTagId);
                }}
                placeholder="Transitive / intransitive pairs"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Link to a grammar note (optional)</Label>
              <Combobox
                value={grammarTagId}
                onChange={(v) => {
                  setGrammarTagId(v);
                  emit(NEW_TAG, newLabel, v);
                }}
                options={grammarOptions}
                placeholder="No grammar link"
                ariaLabel="Grammar note link"
              />
            </div>
          </>
        )
        : null}
    </div>
  );
}

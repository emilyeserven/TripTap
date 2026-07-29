import type { ContrastPair, RuleGroup, RuleGroupStatus } from "@sentence-bank/types";

import { useState } from "react";

import { MAX_GROUP_PAIRS, MIN_GROUP_PAIRS } from "@sentence-bank/types";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateRuleGroup, useUpdateRuleGroup } from "@/hooks/useRuleGroups";

function emptyPair(): ContrastPair {
  return {
    id: crypto.randomUUID(),
    a: {
      jp: "",
      en: "",
    },
    b: {
      jp: "",
      en: "",
    },
    options: ["", ""],
  };
}

function pairComplete(p: ContrastPair): boolean {
  return Boolean(
    p.a.jp.trim() && p.a.en.trim() && p.b.jp.trim() && p.b.en.trim()
    && p.options[0].trim() && p.options[1].trim(),
  );
}

/**
 * Create or edit a rule group's contrast table (spec §6 inv.4, §9, §10). Enforces 4–6 pairs and a
 * named axis client-side (the server enforces them too, plus the recurrence gate); every pair carries
 * both a/b sides and the two front options, so a group structurally can't collapse into a flat list.
 */
export function ContrastGroupForm({
  ruleTagKey,
  ruleTagLabel,
  group,
  seedCorrectionIds,
  onSaved,
  onCancel,
}: {
  ruleTagKey: string;
  ruleTagLabel?: string;
  group?: RuleGroup;
  seedCorrectionIds?: string[];
  onSaved: () => void;
  onCancel?: () => void;
}) {
  const create = useCreateRuleGroup();
  const update = useUpdateRuleGroup();
  const [axis, setAxis] = useState(group?.axis ?? "");
  // Status transitions live on the group card, not this form; preserve the existing status on save.
  const status: RuleGroupStatus = group?.status ?? "proposed";
  const [items, setItems] = useState<ContrastPair[]>(
    group?.items ?? Array.from({
      length: MIN_GROUP_PAIRS,
    }, emptyPair),
  );

  const sizeOk = items.length >= MIN_GROUP_PAIRS && items.length <= MAX_GROUP_PAIRS;
  const canSave = axis.trim().length > 0 && sizeOk && items.every(pairComplete);
  const pending = create.isPending || update.isPending;

  function patchPair(id: string, next: Partial<ContrastPair>) {
    setItems(prev => prev.map(p => (p.id === id
      ? {
        ...p,
        ...next,
      }
      : p)));
  }

  async function save() {
    if (!canSave) return;
    if (group) {
      await update.mutateAsync({
        id: group.id,
        input: {
          axis: axis.trim(),
          items,
          status,
        },
      });
    }
    else {
      await create.mutateAsync({
        ruleTagKey,
        axis: axis.trim(),
        items,
        seedCorrectionIds: seedCorrectionIds ?? [],
        status,
      });
    }
    onSaved();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="group-axis">
          Axis for {ruleTagLabel ?? ruleTagKey}
        </Label>
        <Input
          id="group-axis"
          value={axis}
          onChange={e => setAxis(e.target.value)}
          placeholder="transitive vs intransitive"
        />
        <p className="text-xs text-muted-foreground">
          One axis only — every pair should differ on exactly this.
        </p>
      </div>

      <div className="space-y-3">
        {items.map((pair, i) => (
          <div
            key={pair.id}
            className="space-y-2 rounded-md border p-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Pair {i + 1}</span>
              {items.length > MIN_GROUP_PAIRS
                ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setItems(prev => prev.filter(p => p.id !== pair.id))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )
                : null}
            </div>
            <div
              className="
                grid gap-2
                sm:grid-cols-2
              "
            >
              <Input
                value={pair.a.jp}
                onChange={e => patchPair(pair.id, {
                  a: {
                    ...pair.a,
                    jp: e.target.value,
                  },
                })}
                placeholder="A · 日本語 (電気を消す)"
                aria-label={`Pair ${i + 1} A Japanese`}
              />
              <Input
                value={pair.a.en}
                onChange={e => patchPair(pair.id, {
                  a: {
                    ...pair.a,
                    en: e.target.value,
                  },
                })}
                placeholder="A · English (turn the light off)"
                aria-label={`Pair ${i + 1} A English`}
              />
              <Input
                value={pair.b.jp}
                onChange={e => patchPair(pair.id, {
                  b: {
                    ...pair.b,
                    jp: e.target.value,
                  },
                })}
                placeholder="B · 日本語 (電気が消える)"
                aria-label={`Pair ${i + 1} B Japanese`}
              />
              <Input
                value={pair.b.en}
                onChange={e => patchPair(pair.id, {
                  b: {
                    ...pair.b,
                    en: e.target.value,
                  },
                })}
                placeholder="B · English (the light goes out)"
                aria-label={`Pair ${i + 1} B English`}
              />
              <Input
                value={pair.options[0]}
                onChange={e => patchPair(pair.id, {
                  options: [e.target.value, pair.options[1]],
                })}
                placeholder="Front option 1 (消す)"
                aria-label={`Pair ${i + 1} option 1`}
              />
              <Input
                value={pair.options[1]}
                onChange={e => patchPair(pair.id, {
                  options: [pair.options[0], e.target.value],
                })}
                placeholder="Front option 2 (消える)"
                aria-label={`Pair ${i + 1} option 2`}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {items.length < MAX_GROUP_PAIRS
          ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setItems(prev => [...prev, emptyPair()])}
            >
              Add pair
            </Button>
          )
          : null}
        <span className="text-xs text-muted-foreground">
          {items.length} / {MIN_GROUP_PAIRS}–{MAX_GROUP_PAIRS} pairs
        </span>
        <div className="ml-auto flex gap-2">
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
            {group ? "Save group" : "Create group"}
          </Button>
        </div>
      </div>
    </div>
  );
}

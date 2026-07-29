import type { Writing } from "@sentence-bank/types";

import { useEffect, useMemo, useState } from "react";

import { PinIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useWritings } from "@/hooks/useWritings";

/** How many prior corrected sentences must be reused before the writing can be marked ready. */
const REQUIRED_REUSE = 2;

/**
 * Forced reuse (spec §8): pin the previous corrected draft beside the editor and require N of its
 * corrected sentences to be reused before this writing can be marked ready. The evidence's strongest
 * step, and the one everyone skips — so it's the one the UI makes hardest to skip. Reports whether the
 * requirement is met; when there's no prior corrected draft, it reports met and renders nothing.
 */
export function ForcedReusePanel({
  current,
  onMetChange,
}: {
  current: Writing;
  onMetChange: (met: boolean) => void;
}) {
  const {
    data: writings,
  } = useWritings();
  const [used, setUsed] = useState<Set<string>>(new Set());

  // The most recent *other* writing that has corrections — the draft to reuse from.
  const previous = useMemo(() => {
    const candidates = (writings ?? [])
      .filter(w => w.id !== current.id && (w.corrections?.length ?? 0) > 0)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return candidates[0] ?? null;
  }, [writings, current.id]);

  const sentences = useMemo(
    () => (previous?.corrections ?? []).map(c => c.corrected).filter(Boolean),
    [previous],
  );
  const required = Math.min(REQUIRED_REUSE, sentences.length);
  const met = !previous || used.size >= required;

  useEffect(() => {
    onMetChange(met);
  }, [met, onMetChange]);

  if (!previous || sentences.length === 0) return null;

  function toggle(sentence: string) {
    setUsed((prev) => {
      const next = new Set(prev);
      if (next.has(sentence)) next.delete(sentence);
      else next.add(sentence);
      return next;
    });
  }

  return (
    <Card className="border-primary/40">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm">
          <PinIcon className="size-4" />
          Reuse from your last corrected draft
          <Badge
            variant={met ? "secondary" : "default"}
            className="ml-auto"
          >
            {used.size} / {required}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Work at least {required} of these into what you’re writing, then tick them off.
        </p>
        {sentences.map((sentence, i) => (
          <label
            key={`${sentence}-${i}`}
            className="flex cursor-pointer items-start gap-2 text-sm"
          >
            <Checkbox
              checked={used.has(sentence)}
              onCheckedChange={() => toggle(sentence)}
              className="mt-0.5"
            />
            <span>{sentence}</span>
          </label>
        ))}
      </CardContent>
    </Card>
  );
}

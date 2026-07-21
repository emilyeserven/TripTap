import type { XpRateKey } from "@sentence-bank/types";

import { useEffect, useState } from "react";

import { DEFAULT_XP_RATES, XP_RATE_KEYS } from "@sentence-bank/types";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateXpSettings, useXpSettings } from "@/hooks/useSettings";
import { formatXp } from "@/lib/xp";

/** Reader-facing label per adjustable rate, grouped feature-first to read like the XP rules. */
const RATE_LABELS: Record<XpRateKey, string> = {
  readingTranslatedSentence: "Reading — translated sentence",
  readingWordNote: "Reading — word note",
  writingSentence: "Writing — sentence written",
  writingCorrection: "Writing — correction",
  questionSheetAuthored: "Book exercises — question sheet created",
  answerEntryList: "Book exercises — question answered",
  answerEntryGrid: "Book exercises — table-style question answered",
  listeningEntry: "Listening — sentence",
  shadowingLoop: "Shadowing — loop",
  drillQuestion: "Drills — question",
  lessonLine: "Lessons — line",
  lessonWordNote: "Lessons — word fully filled out",
};

/**
 * Settings card for tuning how much XP each activity earns. XP is derived, so saving new rates
 * re-scores all existing content — "Recalculate" just refetches the summary, which the save already
 * triggers; the button exists for reassurance and for pulling in new activity without a rate change.
 */
export function XpRatesCard() {
  const settings = useXpSettings();
  const update = useUpdateXpSettings();
  // Local draft as strings so partially-typed decimals ("0.", "") don't fight the input.
  const [draft, setDraft] = useState<Record<XpRateKey, string> | null>(null);

  useEffect(() => {
    if (settings.data && draft === null) {
      setDraft(Object.fromEntries(
        XP_RATE_KEYS.map(key => [key, String(settings.data.rates[key])]),
      ) as Record<XpRateKey, string>);
    }
  }, [settings.data, draft]);

  const save = () => {
    if (!draft) return;
    const rates: Partial<Record<XpRateKey, number>> = {};
    for (const key of XP_RATE_KEYS) {
      const value = Number(draft[key]);
      if (!Number.isFinite(value) || value < 0) {
        toast.error(`"${RATE_LABELS[key]}" needs a non-negative number`);
        return;
      }
      rates[key] = value;
    }
    update.mutate({
      rates,
    }, {
      onSuccess: (data) => {
        setDraft(Object.fromEntries(
          XP_RATE_KEYS.map(key => [key, String(data.rates[key])]),
        ) as Record<XpRateKey, string>);
        toast.success("XP rates saved — totals recalculated");
      },
      onError: err => toast.error("Couldn't save the XP rates", {
        description: err instanceof Error ? err.message : undefined,
      }),
    });
  };

  const resetAll = () => {
    update.mutate({
      rates: null,
    }, {
      onSuccess: (data) => {
        setDraft(Object.fromEntries(
          XP_RATE_KEYS.map(key => [key, String(data.rates[key])]),
        ) as Record<XpRateKey, string>);
        toast.success("XP rates reset to defaults — totals recalculated");
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>XP rates</CardTitle>
        <CardDescription>
          How much XP each activity earns. XP is always derived from your saved work, so changing a
          rate re-scores everything — past and future — the next time totals load.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!draft
          ? <p className="text-sm text-muted-foreground">Loading rates…</p>
          : (
            <div
              className="
                grid gap-x-6 gap-y-3
                sm:grid-cols-2
              "
            >
              {XP_RATE_KEYS.map(key => (
                <div
                  key={key}
                  className="space-y-1"
                >
                  <Label
                    htmlFor={`xp-rate-${key}`}
                    className="text-xs"
                  >
                    {RATE_LABELS[key]}
                    {Number(draft[key]) !== DEFAULT_XP_RATES[key] && (
                      <span className="ml-1 text-muted-foreground">
                        (default {formatXp(DEFAULT_XP_RATES[key])})
                      </span>
                    )}
                  </Label>
                  <Input
                    id={`xp-rate-${key}`}
                    type="number"
                    min={0}
                    step={0.25}
                    inputMode="decimal"
                    value={draft[key]}
                    onChange={e => setDraft(prev => (prev
                      ? {
                        ...prev,
                        [key]: e.target.value,
                      }
                      : prev))}
                  />
                </div>
              ))}
            </div>
          )}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            onClick={save}
            disabled={!draft || update.isPending}
          >
            {update.isPending ? "Saving…" : "Save & recalculate"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={resetAll}
            disabled={update.isPending}
          >
            Reset to defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

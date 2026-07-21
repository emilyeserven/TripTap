import type { LearningArea, XpRateKey } from "@sentence-bank/types";

import { useEffect, useState } from "react";

import { DEFAULT_XP_RATES, LEARNING_AREAS, XP_RATE_KEYS } from "@sentence-bank/types";
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
  listeningPassiveMinute: "Listening — passive minute",
  shadowingLoop: "Shadowing — loop",
  drillQuestion: "Drills — question",
  lessonLine: "Lessons — line",
  lessonWordNote: "Lessons — word fully filled out",
  theoryStudyPageDense: "Theory study — dense page",
  theoryStudyPageMedium: "Theory study — medium page",
  theoryStudyPageLight: "Theory study — light page",
  theoryStudyPer250Words: "Theory study — per 250 words",
  theoryStudyNote: "Theory study — note",
};

/**
 * Which learning area each rate feeds, so the card can group its inputs by area. Keys omitted here
 * (book-exercise and drill rates) split their XP across a record's areas, so they don't belong to one
 * area — they're rendered under a "Varies" subsection instead.
 */
const RATE_AREAS: Partial<Record<XpRateKey, LearningArea>> = {
  readingTranslatedSentence: "Reading",
  readingWordNote: "Reading",
  writingSentence: "Writing",
  writingCorrection: "Writing",
  listeningEntry: "Listening",
  listeningPassiveMinute: "Listening",
  lessonLine: "Listening",
  shadowingLoop: "Speaking",
  lessonWordNote: "Vocabulary",
  theoryStudyPageDense: "Grammar",
  theoryStudyPageMedium: "Grammar",
  theoryStudyPageLight: "Grammar",
  theoryStudyPer250Words: "Grammar",
  theoryStudyNote: "Grammar",
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

  // Group the rate inputs by the learning area they feed; keys that split across a record's areas
  // (book-exercise and drill rates) land in a trailing "Varies" section.
  const sections: { heading: string;
    keys: XpRateKey[]; }[] = [
    ...LEARNING_AREAS.map(area => ({
      heading: area,
      keys: XP_RATE_KEYS.filter(key => RATE_AREAS[key] === area),
    })),
    {
      heading: "Varies",
      keys: XP_RATE_KEYS.filter(key => !RATE_AREAS[key]),
    },
  ].filter(section => section.keys.length > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>XP rates</CardTitle>
        <CardDescription>
          How much XP each activity earns. XP is always derived from your saved work, so changing a
          rate re-scores everything — past and future — the next time totals load.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {!draft
          ? <p className="text-sm text-muted-foreground">Loading rates…</p>
          : (
            <div className="space-y-5">
              {sections.map(section => (
                <div
                  key={section.heading}
                  className="space-y-2"
                >
                  <h3 className="text-sm font-semibold">{section.heading}</h3>
                  <div
                    className="
                      grid gap-x-6 gap-y-3
                      sm:grid-cols-2
                    "
                  >
                    {section.keys.map(key => (
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

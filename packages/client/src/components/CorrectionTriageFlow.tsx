import type { RuleTagSelection } from "@/components/RuleTagPicker";
import type { Correction, CorrectionBucket, TriageNodeId } from "@sentence-bank/types";

import { useCallback, useEffect, useMemo, useState } from "react";

import { isCorrectionBucket, TRIAGE_TREE } from "@sentence-bank/types";

import { RuleTagPicker } from "@/components/RuleTagPicker";
import { SentenceTranslationReveal } from "@/components/SentenceTranslationReveal";
import { ShowOriginalToggle } from "@/components/ShowOriginalToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTriageCorrection } from "@/hooks/useCorrections";

const BUCKET_LABELS: Record<CorrectionBucket, string> = {
  slip: "Slip — うっかり",
  rule_gap: "Rule gap — 文法の穴",
  collocation: "Collocation — 不自然",
  register: "Register — 場面違い",
};

const BUCKET_BLURB: Record<CorrectionBucket, string> = {
  slip: "You knew the right form; attention failed. This correction will be deleted — no card.",
  rule_gap: "The rule is nameable. Tag it so recurrences group together.",
  collocation: "Grammatical but unnatural, no statable rule. This becomes a chunk to memorize.",
  register: "Right words, wrong audience. Record the scene it was wrong for.",
};

interface Answer { node: TriageNodeId;
  option: number; }

/** Walk the answered options to the current question node, or the bucket they resolve to. */
function walk(answers: Answer[]): { node: TriageNodeId } | { bucket: CorrectionBucket } {
  let node: TriageNodeId = "q1";
  for (const answer of answers) {
    const option: (typeof TRIAGE_TREE)[TriageNodeId]["options"][number] | undefined
      = TRIAGE_TREE[node].options[answer.option];
    if (!option) return {
      node,
    };
    if (isCorrectionBucket(option.next)) return {
      bucket: option.next,
    };
    node = option.next;
  }
  return {
    node,
  };
}

/**
 * The keyboard-driven triage flow for a single correction (spec §3, §8). Three questions maximum,
 * shown one at a time; keys 1/2 pick an option, Backspace undoes. Landing on a bucket asks for the
 * one field that bucket requires (a rule tag for `rule_gap`, a scene for `register`) before saving.
 * A `slip` deletes the correction on confirm.
 */
export function CorrectionTriageFlow({
  correction,
  onDone,
}: {
  correction: Correction;
  onDone: () => void;
}) {
  const triage = useTriageCorrection();
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [ruleTag, setRuleTag] = useState<RuleTagSelection | null>(null);
  const [scene, setScene] = useState("");
  // Triage leads with the fix; the learner's original is opt-in (this component remounts per
  // correction via its `key`, so this resets for each one).
  const [showOriginal, setShowOriginal] = useState(false);

  // Reset the flow whenever we advance to a new correction.
  useEffect(() => {
    setAnswers([]);
    setRuleTag(null);
    setScene("");
  }, [correction.id]);

  const state = useMemo(() => walk(answers), [answers]);
  const atBucket = "bucket" in state;

  const choose = useCallback((option: number) => {
    setAnswers((prev) => {
      const next = walk(prev);
      if ("bucket" in next) return prev;
      return [...prev, {
        node: next.node,
        option,
      }];
    });
  }, []);

  const undo = useCallback(() => {
    setAnswers(prev => prev.slice(0, -1));
  }, []);

  const bucket = atBucket ? state.bucket : null;
  const canConfirm
    = bucket === "slip"
      || bucket === "collocation"
      || (bucket === "rule_gap" && Boolean(ruleTag?.key))
      || (bucket === "register" && scene.trim().length > 0);

  const confirm = useCallback(async () => {
    if (!bucket || !canConfirm) return;
    await triage.mutateAsync({
      id: correction.id,
      input: {
        bucket,
        path: answers.map(a => a.node),
        ruleTagKey: bucket === "rule_gap" ? ruleTag?.key ?? null : null,
        ruleTagLabel: bucket === "rule_gap" ? ruleTag?.label ?? null : null,
        grammarTagId: bucket === "rule_gap" ? ruleTag?.grammarTagId ?? null : null,
        grammarTagName: bucket === "rule_gap" ? ruleTag?.grammarTagName ?? null : null,
        scene: bucket === "register" ? scene.trim() : null,
      },
    });
    onDone();
  }, [answers, bucket, canConfirm, correction.id, onDone, ruleTag, scene, triage]);

  // Keyboard control: 1/2 pick options on a question, Backspace undoes, Enter confirms a bucket.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";
      if (e.key === "Backspace" && !typing && answers.length > 0) {
        e.preventDefault();
        undo();
        return;
      }
      if (atBucket) {
        if (e.key === "Enter" && canConfirm) {
          e.preventDefault();
          void confirm();
        }
        return;
      }
      if (typing) return;
      if (e.key === "1" || e.key === "a") {
        e.preventDefault();
        choose(0);
      }
      else if (e.key === "2" || e.key === "b") {
        e.preventDefault();
        choose(1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answers.length, atBucket, canConfirm, choose, confirm, undo]);

  const node = !atBucket ? TRIAGE_TREE[state.node] : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Triage</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1 rounded-md bg-muted/50 p-3 text-sm">
          {/* Lead with the fix (or the sentence itself when there's no correction). */}
          {correction.corrected
            ? (
              <p>
                <span className="text-muted-foreground">Fix: </span>
                <span className="text-lg font-medium">{correction.corrected}</span>
              </p>
            )
            : (
              <p>
                <span className="text-muted-foreground">Sentence: </span>
                <span className="text-lg font-medium">{correction.original}</span>
              </p>
            )}
          {/* The intended English meaning, blurred by default (hover to peek, click to reveal). */}
          <SentenceTranslationReveal
            translation={correction.context}
            showTranslation={false}
          />
          {correction.correctorNote
            ? (
              <p className="text-muted-foreground">
                {correction.correctorNote}
              </p>
            )
            : null}
          {/* The learner's original is opt-in, to help place the mistake without leading with it. */}
          {correction.corrected
            ? (
              <div className="space-y-1 pt-1">
                <ShowOriginalToggle
                  open={showOriginal}
                  onToggle={() => setShowOriginal(v => !v)}
                />
                {showOriginal
                  ? (
                    <p>
                      <span className="text-muted-foreground">Wrote: </span>
                      <span
                        className="
                          text-lg font-medium line-through
                          decoration-destructive/60
                        "
                      >
                        {correction.original}
                      </span>
                    </p>
                  )
                  : null}
              </div>
            )
            : null}
        </div>

        {node
          ? (
            <div className="space-y-3">
              <p className="font-medium">{node.question}</p>
              <div className="grid gap-2">
                {node.options.map((option, i) => (
                  <Button
                    key={option.label}
                    variant="outline"
                    className="
                      h-auto justify-start py-3 text-left whitespace-normal
                    "
                    onClick={() => choose(i)}
                  >
                    <span
                      className="mr-2 font-mono text-xs text-muted-foreground"
                    >
                      {i + 1}
                    </span>
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          )
          : null}

        {bucket
          ? (
            <div className="space-y-3">
              <div>
                <p className="font-semibold">{BUCKET_LABELS[bucket]}</p>
                <p className="text-sm text-muted-foreground">{BUCKET_BLURB[bucket]}</p>
              </div>

              {bucket === "rule_gap"
                ? <RuleTagPicker onChange={setRuleTag} />
                : null}

              {bucket === "register"
                ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="triage-scene">Scene</Label>
                    <Input
                      id="triage-scene"
                      autoFocus
                      value={scene}
                      onChange={e => setScene(e.target.value)}
                      placeholder="Speaking to a customer"
                    />
                  </div>
                )
                : null}

              <Button
                onClick={confirm}
                disabled={!canConfirm || triage.isPending}
                variant={bucket === "slip" ? "destructive" : "default"}
              >
                {bucket === "slip" ? "Discard slip" : "Save & next"}
              </Button>
            </div>
          )
          : null}

        <div
          className="
            flex items-center justify-between text-xs text-muted-foreground
          "
        >
          <span>Keys: 1 / 2 to choose, Backspace to undo, Enter to save</span>
          {answers.length > 0
            ? (
              <button
                type="button"
                className="underline"
                onClick={undo}
              >
                Undo
              </button>
            )
            : null}
        </div>
      </CardContent>
    </Card>
  );
}

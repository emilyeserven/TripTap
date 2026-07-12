import type { PracticeSentence } from "@sentence-bank/types";

import { useEffect, useRef, useState } from "react";

import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";

import {
  useCreateMySentence,
  useMySentencesForPractice,
  useUpdateMySentence,
} from "../hooks/useMySentences";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * The "Output" step: the learner writes their own sentence reusing the pattern. It's saved (debounced)
 * as a single **My Sentence** linked to this practice sentence — a learner-produced sentence that
 * starts flagged for correction and is corrected later on the /my-sentences page.
 */
export function PracticeOutput({
  practiceSentence: ps,
}: {
  practiceSentence: PracticeSentence;
}) {
  const {
    data: existing,
  } = useMySentencesForPractice(ps.id);
  const createMy = useCreateMySentence();
  const updateMy = useUpdateMySentence();

  const record = existing?.[0];
  const recordId = useRef<string | null>(null);
  const [text, setText] = useState<string | null>(null); // null = not yet loaded
  const [status, setStatus] = useState("");
  const dirty = useRef(false);

  // Seed once the linked record has loaded (or resolved to none).
  useEffect(() => {
    if (text === null && existing !== undefined) {
      setText(record?.text ?? "");
      recordId.current = record?.id ?? null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing]);

  // Keep the id ref current if the record resolves after a create.
  useEffect(() => {
    if (record?.id) recordId.current = record.id;
  }, [record?.id]);

  // Debounced create-or-update.
  useEffect(() => {
    if (text === null || !dirty.current) return;
    const value = text;
    setStatus("Saving…");
    const timer = setTimeout(async () => {
      try {
        if (recordId.current) {
          await updateMy.mutateAsync({
            id: recordId.current,
            input: {
              text: value,
            },
          });
        }
        else if (value.trim()) {
          const created = await createMy.mutateAsync({
            text: value,
            language: ps.language,
            practiceSentenceId: ps.id,
            needsCorrection: true,
          });
          recordId.current = created.id;
        }
        else {
          setStatus("");
          return;
        }
        setStatus("Saved");
        window.setTimeout(() => setStatus(cur => (cur === "Saved" ? "" : cur)), 1400);
      }
      catch {
        setStatus("Not saved — check your connection");
      }
    }, 700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <Label className="text-sm">Write your own sentence</Label>
          <p className="text-xs text-muted-foreground">
            Same pattern, your life. This becomes one of your sentences to correct later.
          </p>
        </div>
        <span
          className="flex items-center gap-1.5 text-sm text-muted-foreground"
          aria-live="polite"
        >
          {status === "Saved" ? <Check className="size-4 text-primary" /> : null}
          {status}
        </span>
      </div>
      <Textarea
        value={text ?? ""}
        onChange={(e) => {
          dirty.current = true;
          setText(e.target.value);
        }}
        placeholder="家賃も上がるし、まだローンもあるから、頭が痛いんだよね。"
        className="text-lg"
        rows={2}
      />
      {recordId.current
        ? (
          <p className="text-xs text-muted-foreground">
            Saved to
            {" "}
            <Link
              to="/my-sentences"
              className="
                underline
                hover:text-foreground
              "
            >
              My Sentences
            </Link>
            {" "}
            — correct it there when you&apos;re ready.
          </p>
        )
        : null}
    </div>
  );
}

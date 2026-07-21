import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { countWords } from "@/lib/text";

/**
 * A paste-to-count helper: paste text into the box, see a live word count, and "Use count" hands the
 * number back to the caller. The pasted text lives only in local state and is never persisted — the
 * dialog is a counting tool, not a text field. Used by the theory-study form to fill its word count.
 */
export function WordCountDialog({
  onCount,
  trigger,
}: {
  onCount: (count: number) => void;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const count = countWords(text);

  const use = () => {
    onCount(count);
    setOpen(false);
    // Drop the pasted text on close so it never lingers in memory across opens.
    setText("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setText("");
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Count words</DialogTitle>
          <DialogDescription>
            Paste your text to count its words. The text isn’t saved — only the count is used.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Paste the text you read here…"
          rows={8}
          aria-label="Text to count"
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground tabular-nums">
            {count} {count === 1 ? "word" : "words"}
          </p>
          <Button
            type="button"
            onClick={use}
            disabled={count === 0}
          >
            Use count
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

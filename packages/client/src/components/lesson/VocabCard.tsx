import type { LessonRef } from "./LessonBadge";
import type { VocabItem, VocabRenshuuUpdate } from "@sentence-bank/types";

import { useState } from "react";

import { Volume2 } from "lucide-react";

import { Furi } from "./Furi";
import { LessonBadge } from "./LessonBadge";
import { LevelBadge } from "./LevelBadge";
import { speak } from "./speak";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** A single tap-to-flip vocabulary card. Owns its own flip state so it's reusable standalone. */
export function VocabCard({
  vocab: v,
  topLabel,
  lesson,
  onRenshuuChange,
}: {
  vocab: VocabItem;
  /** Small caption on the front (e.g. the category in a lesson). */
  topLabel?: string;
  /** When set, shows a badge linking to the source lesson (for cross-lesson views). */
  lesson?: LessonRef;
  /** When provided, the Renshuu annotation becomes editable; otherwise it's read-only. */
  onRenshuuChange?: (patch: VocabRenshuuUpdate) => void;
}) {
  const [flipped, setFlipped] = useState(false);

  return (
    <Card className="gap-0 overflow-hidden py-0">
      <CardContent
        role="button"
        tabIndex={0}
        onClick={() => setFlipped(f => !f)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setFlipped(f => !f);
          }
        }}
        className="
          flex min-h-28 cursor-pointer flex-col items-center justify-center
          gap-2 py-4 text-center transition-colors select-none
          hover:bg-accent/40
        "
      >
        {flipped
          ? (
            <>
              <div className="text-sm text-muted-foreground">{v.yomi}</div>
              <div className="text-base font-medium">{v.en}</div>
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="secondary"
                  className="size-7"
                  aria-label={`Hear ${v.jp}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    speak(v.jp);
                  }}
                >
                  <Volume2 className="size-4" />
                </Button>
                <LevelBadge lvl={v.lvl} />
              </div>
            </>
          )
          : (
            <>
              {topLabel ? <div className="text-xs text-muted-foreground">{topLabel}</div> : null}
              <div className="text-2xl">
                <Furi
                  kanji={v.jp}
                  yomi={v.yomi}
                />
              </div>
              <LevelBadge lvl={v.lvl} />
            </>
          )}
        {lesson ? <LessonBadge {...lesson} /> : null}
      </CardContent>

      <RenshuuFooter
        vocab={v}
        onRenshuuChange={onRenshuuChange}
      />
    </Card>
  );
}

function RenshuuFooter({
  vocab: v,
  onRenshuuChange,
}: {
  vocab: VocabItem;
  onRenshuuChange?: (patch: VocabRenshuuUpdate) => void;
}) {
  const [draft, setDraft] = useState(v.renshuuList ?? "");
  const [open, setOpen] = useState(false);
  const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

  // Read-only: only surface a badge when it's actually tracked.
  if (!onRenshuuChange) {
    if (!v.renshuuAdded) return null;
    return (
      <div className="border-t px-4 py-2">
        <Badge variant="secondary">{v.renshuuList ? `Renshuu · ${v.renshuuList}` : "Renshuu"}</Badge>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 border-t px-4 py-2"
      onClick={stop}
      onKeyDown={stop}
    >
      <Label className="flex items-center gap-2 text-xs font-normal">
        <Checkbox
          checked={v.renshuuAdded}
          onCheckedChange={checked => onRenshuuChange({
            renshuuAdded: checked === true,
          })}
        />
        In Renshuu
      </Label>
      {v.renshuuAdded && (
        <Popover
          open={open}
          onOpenChange={setOpen}
        >
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto h-6 px-2 text-xs"
            >
              {v.renshuuList || "Set list"}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-60 space-y-2"
            onClick={stop}
            onKeyDown={stop}
          >
            <Label
              htmlFor={`renshuu-${v.id}`}
              className="text-xs"
            >Renshuu list
            </Label>
            <Input
              id={`renshuu-${v.id}`}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder="e.g. Hagi trip"
            />
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setDraft(v.renshuuList ?? "");
                  setOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  onRenshuuChange({
                    renshuuList: draft.trim() || null,
                  });
                  setOpen(false);
                }}
              >
                Save
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

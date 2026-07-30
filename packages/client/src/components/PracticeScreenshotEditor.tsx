import type { PracticeSentence } from "@sentence-bank/types";

import { useRef, useState } from "react";

import { ImagePlus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  useRemovePracticeSentenceImage,
  useUploadPracticeSentenceImage,
} from "@/hooks/usePracticeSentences";

/** Attach / replace / remove a practice sentence's context screenshot on its edit page. */
export function PracticeScreenshotEditor({
  practiceSentence: ps,
}: {
  practiceSentence: PracticeSentence;
}) {
  const upload = useUploadPracticeSentenceImage();
  const remove = useRemovePracticeSentenceImage();
  const inputRef = useRef<HTMLInputElement>(null);
  // Bump on every upload so the <img> (same URL) refetches instead of showing the cached image.
  const [version, setVersion] = useState(0);
  const busy = upload.isPending || remove.isPending;

  async function pick(file: File | undefined) {
    if (!file) return;
    await upload.mutateAsync({
      id: ps.id,
      file,
    });
    setVersion(v => v + 1);
  }

  return (
    <div className="space-y-2">
      <Label>Context screenshot</Label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {ps.hasImage
        ? (
          <div className="flex items-start gap-3">
            <img
              src={`/api/practice-sentences/${ps.id}/image?v=${version}`}
              alt="Context screenshot"
              className="max-h-40 rounded-md border"
            />
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
              >
                <ImagePlus className="size-4" />
                Replace
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive"
                disabled={busy}
                onClick={() => remove.mutate(ps.id)}
              >
                <Trash2 className="size-4" />
                Remove
              </Button>
            </div>
          </div>
        )
        : (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus className="size-4" />
            Attach a screenshot
          </Button>
        )}
    </div>
  );
}

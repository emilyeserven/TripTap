import { useRef, useState } from "react";

import { practiceSentenceImportSchema } from "@sentence-bank/types";
import { useNavigate } from "@tanstack/react-router";
import { ImagePlus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  useImportPracticeSentence,
  useUploadPracticeSentenceImage,
} from "@/hooks/usePracticeSentences";

const PLACEHOLDER = `{
  "text": "電気を消してくれる？",
  "reading": "でんき を けして くれる",
  "translation": "Could you turn off the light?",
  "target": "〜てくれる",
  "targetKind": "grammar",
  "words": [ { "w": "消す", "r": "けす", "m": "to turn off" } ],
  "grammar": [ { "p": "〜てくれる", "n": "a favor done for me" } ]
}`;

/** Paste an AI's sentence breakdown, validate it, optionally attach a screenshot, and import it. */
export function PracticeBreakdownImport() {
  const [text, setText] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const importSentence = useImportPracticeSentence();
  const uploadImage = useUploadPracticeSentenceImage();
  const navigate = useNavigate();

  function selectFile(next: File | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(next);
    setPreviewUrl(next ? URL.createObjectURL(next) : null);
  }

  async function submit() {
    setErrors([]);

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    }
    catch (err) {
      setErrors([`Invalid JSON: ${(err as Error).message}`]);
      return;
    }

    const result = practiceSentenceImportSchema.safeParse(parsed);
    if (!result.success) {
      setErrors(
        result.error.issues
          .slice(0, 8)
          .map(i => `${i.path.join(".") || "(root)"}: ${i.message}`),
      );
      return;
    }

    try {
      const created = await importSentence.mutateAsync(result.data);
      // Attach the screenshot after the sentence exists (it's keyed by the new id).
      if (file) {
        await uploadImage.mutateAsync({
          id: created.id,
          file,
        });
      }
      setText("");
      selectFile(null);
      await navigate({
        to: "/practice/$id",
        params: {
          id: created.id,
        },
      });
    }
    catch (err) {
      setErrors([(err as Error).message]);
    }
  }

  const pending = importSentence.isPending || uploadImage.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import a breakdown</CardTitle>
        <CardDescription>
          Paste the JSON the breakdown skill produced, optionally attach the screenshot you used, then
          import it as a practice card.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={8}
          placeholder={PLACEHOLDER}
          className="font-mono text-xs"
          aria-label="Breakdown JSON"
        />

        <div className="space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const next = e.target.files?.[0] ?? null;
              selectFile(next);
              e.target.value = "";
            }}
          />
          {previewUrl
            ? (
              <div className="flex items-start gap-3">
                <img
                  src={previewUrl}
                  alt="Screenshot preview"
                  className="max-h-40 rounded-md border"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => selectFile(null)}
                >
                  <X className="size-4" />
                  Remove
                </Button>
              </div>
            )
            : (
              <Button
                type="button"
                variant="outline"
                onClick={() => inputRef.current?.click()}
              >
                <ImagePlus className="size-4" />
                Attach a screenshot (optional)
              </Button>
            )}
        </div>

        {errors.length > 0 && (
          <ul className="space-y-1 text-sm text-destructive">
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        )}
        <Button
          onClick={submit}
          disabled={!text.trim() || pending}
        >
          {pending ? "Importing…" : "Validate & import"}
        </Button>
      </CardContent>
    </Card>
  );
}

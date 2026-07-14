import { useState } from "react";

import { aiLessonImportSchema } from "@sentence-bank/types";
import { useNavigate } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useImportAiLesson } from "@/hooks/useAiLessons";

const PLACEHOLDER = `{
  "slug": "my-lesson",
  "title": "…",
  "vocab": [ … ],
  "grammar": [ … ],
  "source": [ … ],
  "culture": [ … ],
  "categories": [ … ]
}`;

/** Paste AI Lesson JSON, validate it against the shared contract, and import it. */
export function AiLessonPasteBox() {
  const [text, setText] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const importAiLesson = useImportAiLesson();
  const navigate = useNavigate();

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

    const result = aiLessonImportSchema.safeParse(parsed);
    if (!result.success) {
      setErrors(
        result.error.issues
          .slice(0, 8)
          .map(i => `${i.path.join(".") || "(root)"}: ${i.message}`),
      );
      return;
    }

    try {
      const aiLesson = await importAiLesson.mutateAsync(result.data);
      setText("");
      await navigate({
        to: "/ai-lessons/$slug",
        params: {
          slug: aiLesson.slug,
        },
      });
    }
    catch (err) {
      setErrors([(err as Error).message]);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import an AI Lesson</CardTitle>
        <CardDescription>
          Paste the JSON produced by the AI Lesson skill, then import it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={8}
          placeholder={PLACEHOLDER}
          className="font-mono text-xs"
          aria-label="AI Lesson JSON"
        />
        {errors.length > 0 && (
          <ul className="space-y-1 text-sm text-destructive">
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        )}
        <Button
          onClick={submit}
          disabled={!text.trim() || importAiLesson.isPending}
        >
          {importAiLesson.isPending ? "Importing…" : "Validate & import"}
        </Button>
      </CardContent>
    </Card>
  );
}

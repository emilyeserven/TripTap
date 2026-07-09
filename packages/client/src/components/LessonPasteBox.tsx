import { useState } from "react";

import { lessonImportSchema } from "@sentence-bank/types";
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
import { useImportLesson } from "@/hooks/useLessons";

const PLACEHOLDER = `{
  "slug": "my-lesson",
  "title": "…",
  "vocab": [ … ],
  "grammar": [ … ],
  "source": [ … ],
  "culture": [ … ],
  "categories": [ … ]
}`;

/** Paste lesson JSON, validate it against the shared contract, and import it. */
export function LessonPasteBox() {
  const [text, setText] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const importLesson = useImportLesson();
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

    const result = lessonImportSchema.safeParse(parsed);
    if (!result.success) {
      setErrors(
        result.error.issues
          .slice(0, 8)
          .map(i => `${i.path.join(".") || "(root)"}: ${i.message}`),
      );
      return;
    }

    try {
      const lesson = await importLesson.mutateAsync(result.data);
      setText("");
      await navigate({
        to: "/lessons/$slug",
        params: {
          slug: lesson.slug,
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
        <CardTitle>Import a lesson</CardTitle>
        <CardDescription>
          Paste the JSON produced by the lesson skill, then import it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={text}
          onChange={e => setText(e.target.value)}
          rows={8}
          placeholder={PLACEHOLDER}
          className="font-mono text-xs"
          aria-label="Lesson JSON"
        />
        {errors.length > 0 && (
          <ul className="space-y-1 text-sm text-destructive">
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        )}
        <Button
          onClick={submit}
          disabled={!text.trim() || importLesson.isPending}
        >
          {importLesson.isPending ? "Importing…" : "Validate & import"}
        </Button>
      </CardContent>
    </Card>
  );
}

import { parseExplanationLines } from "@/lib/explanationRefs";

/**
 * Explains the `phrase: note` convention under an explanation field, and — the part that earns its
 * keep — warns when a phrase doesn't occur in the sentence. Such a line silently degrades to plain
 * prose, so without this a one-character typo just quietly fails to underline anything.
 */
export function ExplanationSyntaxHint({
  explanation,
  target,
}: {
  explanation: string | null | undefined;
  /** The sentence phrases are matched against — the correction if there is one, else the original. */
  target: string;
}) {
  const unmatched = parseExplanationLines(explanation, target)
    .filter(line => line.candidate && !line.matched)
    .map(line => `“${line.candidate}”`);

  return (
    <div className="space-y-0.5 text-xs text-muted-foreground">
      <p>
        Markdown supported. Start a line with an exact phrase from the sentence and a colon —
        {" "}
        <code className="rounded-sm bg-muted px-1">は: topic marker, not が</code>
        {" "}
        — to underline that phrase and attach the note to it.
      </p>
      {unmatched.length > 0
        ? (
          <p className="text-destructive">
            Not found in the sentence, so {unmatched.length === 1 ? "this stays" : "these stay"}
            {" "}
            plain text: {unmatched.join(", ")}
          </p>
        )
        : null}
    </div>
  );
}

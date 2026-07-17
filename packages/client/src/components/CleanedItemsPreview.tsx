import type { DerivedItems } from "@/lib/cleanedBlocks";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * The live "Resulting items" preview card of the cleaned-blocks editor: the sentences and vocab the
 * current grouping produces, the skip count, and the create button.
 */
export function CleanedItemsPreview({
  preview,
  vocabName,
  done,
  hasError,
  busy,
  onCreate,
}: {
  preview: DerivedItems;
  /** Resolve a linked vocab id to its display term. */
  vocabName: (id: string) => string;
  /** Success message from the last create, or null. */
  done: string | null;
  hasError: boolean;
  busy: boolean;
  onCreate: () => void;
}) {
  const totalValid = preview.sentences.length + preview.vocab.length;
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Resulting items —
          {" "}
          {totalValid}
        </CardTitle>
        <CardDescription>
          Live preview of what each group produces. Groups with no text line are skipped.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {preview.sentences.length > 0
          ? (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-700">
                Sentences —
                {" "}
                {preview.sentences.length}
              </h3>
              {preview.sentences.map((s, i) => (
                <div
                  key={i}
                  className="rounded-md border border-input p-2 text-sm"
                >
                  <div className="font-medium">{s.text}</div>
                  {s.translation ? <div className="text-muted-foreground">{s.translation}</div> : null}
                  <div className="mt-0.5 flex flex-wrap items-center gap-1">
                    <span className="text-xs text-muted-foreground">
                      {s.language}
                    </span>
                    {(s.vocabIds ?? []).map(id => (
                      <span
                        key={id}
                        className="
                          rounded-full bg-blue-50 px-2 py-0.5 text-xs
                          text-blue-700
                        "
                      >
                        {vocabName(id)}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
          : null}

        {preview.vocab.length > 0
          ? (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-700">
                Vocab —
                {" "}
                {preview.vocab.length}
              </h3>
              {preview.vocab.map((v, i) => (
                <div
                  key={i}
                  className="rounded-md border border-input p-2 text-sm"
                >
                  <span className="font-medium">{v.term}</span>
                  {v.reading ? <span className="ml-2 text-muted-foreground">{v.reading}</span> : null}
                  {v.meaning ? <span className="ml-2">{v.meaning}</span> : null}
                  <span className="ml-2 text-xs text-muted-foreground">{v.language}</span>
                </div>
              ))}
            </div>
          )
          : null}

        {totalValid === 0
          ? <p className="text-sm text-muted-foreground">Nothing to create yet.</p>
          : null}
        {preview.skipped > 0
          ? (
            <p className="text-xs text-muted-foreground">
              {preview.skipped}
              {" "}
              group(s) skipped (no text line).
            </p>
          )
          : null}

        {done ? <p className="text-sm font-medium text-green-700">{done}</p> : null}
        {hasError
          ? <p className="text-sm text-destructive">Could not create items.</p>
          : null}

        <Button
          type="button"
          onClick={onCreate}
          disabled={busy || totalValid === 0}
        >
          {busy ? "Creating…" : `Create ${totalValid} item(s)`}
        </Button>
      </CardContent>
    </Card>
  );
}

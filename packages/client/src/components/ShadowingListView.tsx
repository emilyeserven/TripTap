import type { MySentence, Sentence, ShadowingList } from "@sentence-bank/types";

import { Link } from "@tanstack/react-router";
import { Volume2, X } from "lucide-react";

import { speak } from "@/components/ai-lesson/speak";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMySentences } from "@/hooks/useMySentences";
import { useSentences } from "@/hooks/useSentences";
import { useUpdateShadowingList } from "@/hooks/useShadowingLists";

type Member
  = | { kind: "sentence";
    id: string;
    text: string;
    translation: string | null;
    to: string; }
    | { kind: "mySentence";
      id: string;
      text: string;
      translation: string | null;
      to: string; };

/**
 * Read-only view of a shadowing list: its notes plus every member sentence, resolved from the bank
 * (`sentenceIds`) and the learner's own sentences (`mySentenceIds`). Each row can be removed from the
 * list (which PATCHes the list's id arrays); ids that no longer resolve are silently dropped.
 */
export function ShadowingListView({
  list,
}: {
  list: ShadowingList;
}) {
  const {
    data: sentences,
  } = useSentences();
  const {
    data: mySentences,
  } = useMySentences();
  const update = useUpdateShadowingList();

  const bankById = new Map((sentences ?? []).map(s => [s.id, s] as const));
  const mineById = new Map((mySentences ?? []).map(s => [s.id, s] as const));

  const members: Member[] = [
    ...list.sentenceIds
      .map(id => bankById.get(id))
      .filter((s): s is Sentence => s !== undefined)
      .map(s => ({
        kind: "sentence" as const,
        id: s.id,
        text: s.text,
        translation: s.translation,
        to: "/sentences",
      })),
    ...list.mySentenceIds
      .map(id => mineById.get(id))
      .filter((s): s is MySentence => s !== undefined)
      .map(s => ({
        kind: "mySentence" as const,
        id: s.id,
        text: s.correction?.trim() ? s.correction : s.text,
        translation: s.translation,
        to: `/my-sentences/${s.id}`,
      })),
  ];

  const removeMember = (kind: Member["kind"], id: string) => {
    const input = kind === "sentence"
      ? {
        sentenceIds: list.sentenceIds.filter(x => x !== id),
      }
      : {
        mySentenceIds: list.mySentenceIds.filter(x => x !== id),
      };
    update.mutate({
      id: list.id,
      input,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{list.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {members.length} {members.length === 1 ? "sentence" : "sentences"} to shadow
        </p>
        {list.notes
          ? <p className="mt-2 text-sm whitespace-pre-wrap">{list.notes}</p>
          : null}
      </div>

      {members.length === 0
        ? (
          <p className="text-muted-foreground">
            No sentences yet. Add some from the
            {" "}
            <Link
              to="/sentences"
              className="underline"
            >
              Sentences
            </Link>
            {" "}
            page (or
            {" "}
            <Link
              to="/my-sentences"
              className="underline"
            >
              My Sentences
            </Link>
            ) using the “Add to shadowing list” button on a card.
          </p>
        )
        : (
          <div className="space-y-3">
            {members.map(m => (
              <Card key={`${m.kind}:${m.id}`}>
                <CardContent
                  className="flex items-start justify-between gap-3 p-4"
                >
                  <div className="flex min-w-0 items-start gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-6 shrink-0 translate-y-0.5"
                      aria-label="Hear"
                      onClick={() => speak(m.text)}
                    >
                      <Volume2 className="size-4" />
                    </Button>
                    <div className="min-w-0">
                      <p className="text-lg font-semibold">{m.text}</p>
                      {m.translation
                        ? <p className="text-sm text-muted-foreground">{m.translation}</p>
                        : null}
                    </div>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8 shrink-0 text-muted-foreground"
                    aria-label="Remove from this list"
                    disabled={update.isPending}
                    onClick={() => removeMember(m.kind, m.id)}
                  >
                    <X className="size-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
    </div>
  );
}

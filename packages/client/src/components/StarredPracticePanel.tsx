import { useMemo } from "react";

import { Star } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAiLessonContent } from "@/hooks/useAiLessons";
import { useGrammarNotes } from "@/hooks/useGrammarNotes";
import { useVocab } from "@/hooks/useVocab";

/** A starred vocab item, normalized across the bank and AI-lesson sources. */
interface StarredVocab {
  id: string;
  term: string;
  reading: string | null;
  meaning: string | null;
}

/**
 * A passive reminder of the grammar and vocab you've starred — the things you actually want to
 * practice — shown beside the My Writing editor so you can consciously work them into what you write.
 * Read-only: it doesn't gate anything. Renders nothing when nothing is starred anywhere.
 */
export function StarredPracticePanel() {
  const {
    data: grammarNotes,
  } = useGrammarNotes();
  const {
    data: bankVocab,
  } = useVocab();
  const {
    data: aiContent,
  } = useAiLessonContent();

  const grammar = useMemo(
    () => (grammarNotes ?? []).filter(n => n.starred),
    [grammarNotes],
  );

  const vocab = useMemo<StarredVocab[]>(() => {
    const bank = (bankVocab ?? [])
      .filter(v => v.starred)
      .map(v => ({
        id: v.id,
        term: v.term,
        reading: v.reading,
        meaning: v.meaning,
      }));
    const ai = (aiContent?.vocab ?? [])
      .filter(v => v.starred)
      .map(v => ({
        id: v.id,
        term: v.jp,
        reading: v.yomi || null,
        meaning: v.en || null,
      }));
    return [...bank, ...ai];
  }, [bankVocab, aiContent]);

  if (grammar.length === 0 && vocab.length === 0) return null;

  return (
    <Card className="border-amber-400/40">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-sm">
          <Star className="size-4 fill-amber-400 text-amber-400" />
          Practice these
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Items you’ve starred — try to work some into what you’re writing.
        </p>
        {grammar.length > 0
          ? (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Grammar</p>
              <ul className="space-y-0.5">
                {grammar.map(n => (
                  <li
                    key={n.id}
                    className="text-sm"
                  >
                    {n.title}
                    {n.tagName && n.tagName !== n.title
                      ? <span className="text-muted-foreground"> · {n.tagName}</span>
                      : null}
                  </li>
                ))}
              </ul>
            </div>
          )
          : null}
        {vocab.length > 0
          ? (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Vocab</p>
              <ul className="space-y-0.5">
                {vocab.map(v => (
                  <li
                    key={v.id}
                    className="text-sm"
                  >
                    {v.term}
                    {v.reading ? <span className="text-muted-foreground"> ({v.reading})</span> : null}
                    {v.meaning ? <span className="text-muted-foreground"> — {v.meaning}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          )
          : null}
      </CardContent>
    </Card>
  );
}

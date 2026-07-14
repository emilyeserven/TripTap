import type { AiLessonDetail } from "@sentence-bank/types";

import { useMemo } from "react";

import { BookOpen, GraduationCap, Landmark, RefreshCw, ScrollText, Video } from "lucide-react";

import { FuriganaScope } from "./FuriganaScope";
import { FuriganaToggle } from "./FuriganaToggle";
import { CulturePane, GrammarPane, PracticePane, SourcePane, VocabPane } from "./panes";
import { VocabMapContext } from "./vocab-map-context";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** Renders a full AI Lesson from its data. The fixed scaffold; all content comes from `aiLesson`. */
export function AiLessonTemplate({
  aiLesson,
}: { aiLesson: AiLessonDetail }) {
  const vocabMap = useMemo(
    () => Object.fromEntries(aiLesson.vocab.map(v => [v.jp, v])),
    [aiLesson.vocab],
  );

  return (
    <FuriganaScope>
      <VocabMapContext.Provider value={vocabMap}>
        <article className="space-y-6">
          <header className="space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div
                  className="
                    text-xs font-medium tracking-wide text-muted-foreground
                    uppercase
                  "
                >
                  {aiLesson.eyebrow}
                </div>
                <h1 className="text-3xl font-bold">{aiLesson.title}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{aiLesson.subtitle}</p>
              </div>
              <FuriganaToggle />
            </div>
            {aiLesson.videoUrl && (
              <a
                href={aiLesson.videoUrl}
                target="_blank"
                rel="noreferrer"
                className="
                  inline-flex items-center gap-1.5 text-sm text-primary
                  hover:underline
                "
              >
                <Video className="size-4" />
                Watch the source video
              </a>
            )}
          </header>

          <Tabs defaultValue="culture">
            <TabsList className="flex h-auto w-full flex-wrap justify-start">
              <TabsTrigger value="culture">
                <Landmark className="size-4" />
                Culture
              </TabsTrigger>
              <TabsTrigger value="vocab">
                <BookOpen className="size-4" />
                Vocabulary
              </TabsTrigger>
              <TabsTrigger value="grammar">
                <GraduationCap className="size-4" />
                Grammar
              </TabsTrigger>
              <TabsTrigger value="source">
                <ScrollText className="size-4" />
                Sentences
              </TabsTrigger>
              <TabsTrigger value="practice">
                <RefreshCw className="size-4" />
                Practice
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="culture"
              className="mt-4"
            >
              <CulturePane culture={aiLesson.culture} />
            </TabsContent>
            <TabsContent
              value="vocab"
              className="mt-4"
            >
              <VocabPane
                vocab={aiLesson.vocab}
                categories={aiLesson.categories}
              />
            </TabsContent>
            <TabsContent
              value="grammar"
              className="mt-4"
            >
              <GrammarPane grammar={aiLesson.grammar} />
            </TabsContent>
            <TabsContent
              value="source"
              className="mt-4"
            >
              <SourcePane source={aiLesson.source} />
            </TabsContent>
            <TabsContent
              value="practice"
              className="mt-4"
            >
              <PracticePane vocab={aiLesson.vocab} />
            </TabsContent>
          </Tabs>

          <footer className="border-t pt-4 text-xs text-muted-foreground">
            {aiLesson.footerText}
            {aiLesson.sourceUrl && (
              <>
                {" · "}
                <a
                  href={aiLesson.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline"
                >
                  {aiLesson.sourceUrl}
                </a>
              </>
            )}
          </footer>
        </article>
      </VocabMapContext.Provider>
    </FuriganaScope>
  );
}

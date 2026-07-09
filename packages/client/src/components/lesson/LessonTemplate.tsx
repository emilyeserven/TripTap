import type { LessonDetail } from "@sentence-bank/types";

import { useMemo } from "react";

import { BookOpen, GraduationCap, Landmark, RefreshCw, ScrollText, Video } from "lucide-react";

import { FuriganaScope } from "./FuriganaScope";
import { FuriganaToggle } from "./FuriganaToggle";
import { CulturePane, GrammarPane, PracticePane, SourcePane, VocabPane } from "./panes";
import { VocabMapContext } from "./vocab-map-context";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** Renders a full lesson from its data. The fixed scaffold; all content comes from `lesson`. */
export function LessonTemplate({
  lesson,
}: { lesson: LessonDetail }) {
  const vocabMap = useMemo(
    () => Object.fromEntries(lesson.vocab.map(v => [v.jp, v])),
    [lesson.vocab],
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
                  {lesson.eyebrow}
                </div>
                <h1 className="text-3xl font-bold">{lesson.title}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{lesson.subtitle}</p>
              </div>
              <FuriganaToggle />
            </div>
            {lesson.videoUrl && (
              <a
                href={lesson.videoUrl}
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
              <CulturePane culture={lesson.culture} />
            </TabsContent>
            <TabsContent
              value="vocab"
              className="mt-4"
            >
              <VocabPane
                vocab={lesson.vocab}
                categories={lesson.categories}
              />
            </TabsContent>
            <TabsContent
              value="grammar"
              className="mt-4"
            >
              <GrammarPane grammar={lesson.grammar} />
            </TabsContent>
            <TabsContent
              value="source"
              className="mt-4"
            >
              <SourcePane source={lesson.source} />
            </TabsContent>
            <TabsContent
              value="practice"
              className="mt-4"
            >
              <PracticePane vocab={lesson.vocab} />
            </TabsContent>
          </Tabs>

          <footer className="border-t pt-4 text-xs text-muted-foreground">
            {lesson.footerText}
            {lesson.sourceUrl && (
              <>
                {" · "}
                <a
                  href={lesson.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline"
                >
                  {lesson.sourceUrl}
                </a>
              </>
            )}
          </footer>
        </article>
      </VocabMapContext.Provider>
    </FuriganaScope>
  );
}

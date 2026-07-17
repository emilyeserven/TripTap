import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify, { type FastifyInstance } from "fastify";
import { aiLessonRoutes } from "@/routes/ai-lessons";
import { answerSheetRoutes } from "@/routes/answer-sheets";
import { bookmarksRoutes } from "@/routes/bookmarks";
import { captureRoutes } from "@/routes/captures";
import { dictionaryRoutes } from "@/routes/dictionary";
import { drillReasonCategoryRoutes } from "@/routes/drill-reason-categories";
import { drillSessionRoutes } from "@/routes/drill-sessions";
import { grammarNoteRoutes } from "@/routes/grammar-notes";
import { healthRoutes } from "@/routes/health";
import { lessonRoutes } from "@/routes/lessons";
import { listeningSessionsRoutes } from "@/routes/listening-sessions";
import { migakuImportRoutes } from "@/routes/migaku-import";
import { mySentenceRoutes } from "@/routes/my-sentences";
import { ocrRoutes } from "@/routes/ocr";
import { parseTemplateRoutes } from "@/routes/parse-templates";
import { practiceSentenceRoutes } from "@/routes/practice-sentences";
import { questionSheetRoutes } from "@/routes/question-sheets";
import { readingSessionsRoutes } from "@/routes/reading-sessions";
import { sentenceRoutes } from "@/routes/sentences";
import { settingsRoutes } from "@/routes/settings";
import { shadowingSessionsRoutes } from "@/routes/shadowing-sessions";
import { sourceRoutes } from "@/routes/sources";
import { tutorRoutes } from "@/routes/tutors";
import { vocabRoutes } from "@/routes/vocab";
import { writingRoutes } from "@/routes/writings";
import { writingPromptRoutes } from "@/routes/writing-prompts";

/** Build and configure the Fastify application (without starting it). */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
    },
  });

  await app.register(cors, {
    origin: true,
  });

  // Image uploads for OCR capture. Bypasses the default 1 MiB JSON body limit; cap the file size.
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: "sentence-bank API",
        version: "0.1.0",
      },
      tags: [
        {
          name: "sentences",
          description: "Sentence bank endpoints",
        },
        {
          name: "practice-sentences",
          description: "Practice sentences (study-aid worksheet cards)",
        },
        {
          name: "my-sentences",
          description: "Learner-produced sentences awaiting correction",
        },
        {
          name: "writings",
          description: "Free-form learner writing with inline corrections",
        },
        {
          name: "question-sheets",
          description: "Reusable templates of textbook/worksheet questions",
        },
        {
          name: "answer-sheets",
          description: "Filled-in attempts at a question sheet, with corrections",
        },
        {
          name: "listening-sessions",
          description: "Listen and Shadow sessions — video + timestamped notes",
        },
        {
          name: "migaku-import",
          description: "Import Migaku/Anki .apkg decks as sentences & vocab (with media)",
        },
        {
          name: "shadowing-sessions",
          description: "Shadowing practice sessions — looped video segments + notes",
        },
        {
          name: "reading-sessions",
          description: "Reading sessions — passage translation, corrections, word notes",
        },
        {
          name: "writing-prompts",
          description: "Reusable prompts to spark a free-write",
        },
        {
          name: "ai-lessons",
          description: "AI Lesson import & viewing",
        },
        {
          name: "lessons",
          description: "Tutoring lessons — date, tutor, listening/word notes, answer sheets",
        },
        {
          name: "tutors",
          description: "Tutors who run lessons",
        },
        {
          name: "grammar-notes",
          description: "Rich notes on grammar usages, linking sentences, resources, and related grammar",
        },
        {
          name: "drill-sessions",
          description: "Drill Buddy — logged mistakes and reflections from drilling",
        },
        {
          name: "drill-reason-categories",
          description: "Drill Buddy — the reusable mistake-reason taxonomy",
        },
        {
          name: "health",
          description: "Service health",
        },
        {
          name: "ocr",
          description: "Image text extraction (OCR)",
        },
        {
          name: "settings",
          description: "Server-side settings (e.g. cloud OCR credentials)",
        },
        {
          name: "captures",
          description: "OCR captures and their created items",
        },
        {
          name: "sources",
          description: "Source taxonomy (books, shows, articles)",
        },
        {
          name: "vocab",
          description: "Standalone vocabulary bank",
        },
        {
          name: "parse-templates",
          description: "Saved capture-parsing templates",
        },
        {
          name: "bookmarks",
          description: "External bookmarks tag/taxonomy proxy",
        },
        {
          name: "dictionary",
          description: "Japanese dictionary lookup proxy (Jisho / Jotoba)",
        },
      ],
    },
  });
  await app.register(swaggerUi, {
    routePrefix: "/docs",
  });

  await app.register(healthRoutes);
  await app.register(bookmarksRoutes);
  await app.register(dictionaryRoutes);
  await app.register(sentenceRoutes);
  await app.register(practiceSentenceRoutes);
  await app.register(mySentenceRoutes);
  await app.register(writingRoutes);
  await app.register(questionSheetRoutes);
  await app.register(answerSheetRoutes);
  await app.register(listeningSessionsRoutes);
  await app.register(shadowingSessionsRoutes);
  await app.register(readingSessionsRoutes);
  await app.register(writingPromptRoutes);
  await app.register(tutorRoutes);
  await app.register(grammarNoteRoutes);
  await app.register(lessonRoutes);
  await app.register(drillReasonCategoryRoutes);
  await app.register(drillSessionRoutes);
  await app.register(sourceRoutes);
  await app.register(vocabRoutes);
  await app.register(captureRoutes);
  await app.register(parseTemplateRoutes);
  await app.register(aiLessonRoutes);
  await app.register(ocrRoutes);
  await app.register(migakuImportRoutes);
  await app.register(settingsRoutes);

  return app;
}

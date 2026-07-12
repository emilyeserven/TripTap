import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify, { type FastifyInstance } from "fastify";
import { bookmarksRoutes } from "@/routes/bookmarks";
import { captureRoutes } from "@/routes/captures";
import { healthRoutes } from "@/routes/health";
import { lessonRoutes } from "@/routes/lessons";
import { mySentenceRoutes } from "@/routes/my-sentences";
import { ocrRoutes } from "@/routes/ocr";
import { parseTemplateRoutes } from "@/routes/parse-templates";
import { practiceSentenceRoutes } from "@/routes/practice-sentences";
import { sentenceRoutes } from "@/routes/sentences";
import { settingsRoutes } from "@/routes/settings";
import { sourceRoutes } from "@/routes/sources";
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
          name: "writing-prompts",
          description: "Reusable prompts to spark a free-write",
        },
        {
          name: "lessons",
          description: "Lesson import & viewing",
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
      ],
    },
  });
  await app.register(swaggerUi, {
    routePrefix: "/docs",
  });

  await app.register(healthRoutes);
  await app.register(bookmarksRoutes);
  await app.register(sentenceRoutes);
  await app.register(practiceSentenceRoutes);
  await app.register(mySentenceRoutes);
  await app.register(writingRoutes);
  await app.register(writingPromptRoutes);
  await app.register(sourceRoutes);
  await app.register(vocabRoutes);
  await app.register(captureRoutes);
  await app.register(parseTemplateRoutes);
  await app.register(lessonRoutes);
  await app.register(ocrRoutes);
  await app.register(settingsRoutes);

  return app;
}

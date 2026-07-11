import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify, { type FastifyInstance } from "fastify";
import { healthRoutes } from "@/routes/health";
import { lessonRoutes } from "@/routes/lessons";
import { ocrRoutes } from "@/routes/ocr";
import { sentenceRoutes } from "@/routes/sentences";
import { settingsRoutes } from "@/routes/settings";
import { sourceRoutes } from "@/routes/sources";

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
      ],
    },
  });
  await app.register(swaggerUi, {
    routePrefix: "/docs",
  });

  await app.register(healthRoutes);
  await app.register(sentenceRoutes);
  await app.register(sourceRoutes);
  await app.register(lessonRoutes);
  await app.register(ocrRoutes);
  await app.register(settingsRoutes);

  return app;
}

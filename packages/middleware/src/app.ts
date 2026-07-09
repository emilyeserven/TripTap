import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify, { type FastifyInstance } from "fastify";
import { healthRoutes } from "@/routes/health";
import { sentenceRoutes } from "@/routes/sentences";

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
          name: "health",
          description: "Service health",
        },
      ],
    },
  });
  await app.register(swaggerUi, {
    routePrefix: "/docs",
  });

  await app.register(healthRoutes);
  await app.register(sentenceRoutes);

  return app;
}

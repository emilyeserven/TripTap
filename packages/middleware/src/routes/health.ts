import type { FastifyInstance } from "fastify";

/** Liveness probe used by the gateway and container orchestrators. */
export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/healthz", {
    schema: {
      tags: ["health"],
    },
  }, async () => ({
    status: "ok",
  }));
}

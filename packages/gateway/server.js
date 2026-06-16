// TripTap production gateway.
//
// A single Fastify entrypoint that:
//   1. applies the database schema on boot (drizzle-kit push),
//   2. spawns the middleware API as a child process and respawns it with backoff,
//   3. proxies `/api/*` to the middleware,
//   4. serves the client's static build (with SPA fallback),
//   5. exposes `/healthz` for orchestrators.
//
// The only configuration it needs in production is `DATABASE_URL`.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import fastifyHttpProxy from "@fastify/http-proxy";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";

const here = dirname(fileURLToPath(import.meta.url));
const appRoot = join(here, "..", "..");
const middlewareDir = join(appRoot, "packages", "middleware");
const clientDist = join(appRoot, "packages", "client", "dist");

const GATEWAY_PORT = Number(process.env.PORT ?? 3000);
const MIDDLEWARE_PORT = Number(process.env.MIDDLEWARE_PORT ?? 3001);
const MIDDLEWARE_URL = `http://127.0.0.1:${MIDDLEWARE_PORT}`;

let middlewareChild = null;
let shuttingDown = false;
let restartDelay = 500;
const MAX_RESTART_DELAY = 16_000;

function binPath() {
  return [
    join(middlewareDir, "node_modules", ".bin"),
    join(appRoot, "node_modules", ".bin"),
    process.env.PATH ?? "",
  ].join(":");
}

/** Run a one-shot command and resolve with its exit code (never rejects). */
function runOnce(command, args, cwd) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      env: {
        ...process.env,
        PATH: binPath(),
      },
    });
    child.on("error", (err) => {
      console.error(`[gateway] "${command}" failed to start: ${err.message}`);
      resolve(1);
    });
    child.on("exit", code => resolve(code ?? 0));
  });
}

async function applySchema() {
  console.log("[gateway] applying database schema (drizzle-kit push)…");
  const code = await runOnce("drizzle-kit", ["push"], middlewareDir);
  if (code !== 0) {
    console.error(`[gateway] drizzle-kit push exited with ${code}; continuing anyway.`);
  }
}

function startMiddleware() {
  middlewareChild = spawn(process.execPath, [join(middlewareDir, "dist", "index.js")], {
    cwd: middlewareDir,
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV ?? "production",
      PORT: String(MIDDLEWARE_PORT),
      HOST: "127.0.0.1",
    },
  });

  middlewareChild.on("exit", (code, signal) => {
    middlewareChild = null;
    if (shuttingDown) return;
    console.error(
      `[gateway] middleware exited (code=${code}, signal=${signal}); restarting in ${restartDelay}ms`,
    );
    setTimeout(startMiddleware, restartDelay);
    restartDelay = Math.min(restartDelay * 2, MAX_RESTART_DELAY);
  });

  // Reset the backoff once the process has stayed up for a while.
  setTimeout(() => {
    restartDelay = 500;
  }, 30_000);
}

async function waitForMiddleware(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${MIDDLEWARE_URL}/healthz`);
      if (res.ok) return true;
    }
    catch {
      // not up yet
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  return false;
}

async function startGateway() {
  const app = Fastify({
    logger: false,
  });

  await app.register(fastifyHttpProxy, {
    upstream: MIDDLEWARE_URL,
    prefix: "/api",
    rewritePrefix: "/api",
  });

  app.get("/healthz", async () => ({
    status: "ok",
  }));

  if (existsSync(clientDist)) {
    await app.register(fastifyStatic, {
      root: clientDist,
      wildcard: false,
    });
    // SPA fallback: serve index.html for client-side routes.
    app.setNotFoundHandler((req, reply) => {
      if (req.method === "GET" && !req.url.startsWith("/api")) {
        return reply.sendFile("index.html");
      }
      return reply.code(404).send({
        message: "Not found",
      });
    });
  }
  else {
    console.warn(`[gateway] client build not found at ${clientDist} — serving API only.`);
  }

  await app.listen({
    port: GATEWAY_PORT,
    host: "0.0.0.0",
  });
  console.log(`[gateway] listening on http://0.0.0.0:${GATEWAY_PORT}`);
}

function shutdown(signal) {
  shuttingDown = true;
  if (middlewareChild) middlewareChild.kill(signal);
  process.exit(0);
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => shutdown(signal));
}

await applySchema();
startMiddleware();
await waitForMiddleware();
await startGateway();

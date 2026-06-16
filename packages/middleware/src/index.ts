import "dotenv/config";
import { buildApp } from "@/app";
import { maybeSeed } from "@/db/seed";

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "0.0.0.0";

const app = await buildApp();

try {
  await maybeSeed();
}
catch (err) {
  app.log.warn({
    err,
  }, "Seed skipped (database not ready?)");
}

try {
  await app.listen({
    port,
    host,
  });
  app.log.info(`TripTap API ready on http://${host}:${port} (docs at /docs)`);
}
catch (err) {
  app.log.error(err);
  process.exit(1);
}

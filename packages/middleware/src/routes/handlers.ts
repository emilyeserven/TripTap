import type { FastifyReply, FastifyRequest } from "fastify";

/**
 * The two things every entity handler does identically.
 *
 * A detail/update/delete handler reads `:id` and, when the service returns nothing, sends a 404
 * naming the entity. Those were spelled out 108 and 98 times respectively — always the same cast,
 * always the same `{ message: "<Noun> not found" }` body.
 *
 * Deliberately two small functions rather than a `withEntity(…)` wrapper: a wrapper would hide the
 * control flow of every detail route to save one line each, and the routes are the one place in
 * this codebase where "what does this endpoint do" should be readable straight down the page.
 * Companion to {@link ./upstream-errors.ts}, which does the same job for proxy routes.
 */

/** The `:id` path param, narrowed. The route's `params` schema is what actually validates it. */
export function idOf(req: FastifyRequest): string {
  return (req.params as { id: string }).id;
}

/**
 * Send the 404 an entity route sends when its row doesn't exist.
 *
 * `noun` is the entity in sentence case — `notFound(reply, "Tutor")` → `"Tutor not found"`.
 */
export function notFound(reply: FastifyReply, noun: string): FastifyReply {
  return reply.code(404).send({
    message: `${noun} not found`,
  });
}

/** A binary payload a media route streams back — `StoredMedia` and `BookmarksImage` both fit. */
interface MediaPayload {
  contentType: string;
  body: Buffer;
}

/**
 * Stream a media payload, or 404 with `missing` when there is none.
 *
 * Five media routes — sentence audio/image, vocab audio/image, shadowing audio, and the two
 * bookmark image proxies — each set the same `Content-Type` + `Cache-Control` pair and send the
 * body. The day-long private cache is the part worth having in one place: a route that forgets it
 * re-fetches an unchanged image on every render, and nothing fails loudly when it does.
 */
export function sendMedia(
  reply: FastifyReply,
  media: MediaPayload | null | undefined,
  missing: string,
): FastifyReply {
  if (!media) {
    return reply.code(404).send({
      message: missing,
    });
  }
  reply.header("Content-Type", media.contentType);
  reply.header("Cache-Control", "private, max-age=86400");
  return reply.send(media.body);
}

/**
 * The raw query string of a request, `?` included, or `""` when there is none.
 *
 * The bookmark image proxies forward the caller's query verbatim to the upstream host (it carries
 * the host's own sizing/format parameters), so they need the unparsed string rather than `req.query`.
 */
export function rawQuery(req: FastifyRequest): string {
  const start = req.url.indexOf("?");
  return start >= 0 ? req.url.slice(start) : "";
}

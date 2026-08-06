import assert from "node:assert/strict";
import { test } from "node:test";
import { handleUpstreamError } from "@/routes/upstream-errors";
import { BookmarksNotConfiguredError, BookmarksUnavailableError } from "@/services/bookmarks/errors";
import { MediaUnavailableError } from "@/services/media/errors";
import { TatoebaUnavailableError } from "@/services/tatoeba/errors";
import {
  UpstreamNotConfiguredError,
  UpstreamUnavailableError,
} from "@/services/upstream-errors";

/** Minimal Fastify reply stand-in: records the status and body it was sent. */
function fakeReply() {
  const sent: { status?: number;
    body?: unknown; } = {};
  const reply = {
    code(status: number) {
      sent.status = status;
      return reply;
    },
    send(body: unknown) {
      sent.body = body;
      return reply;
    },
    sent,
  };
  return reply;
}

test("every service's not-configured error maps to 503", () => {
  for (const err of [
    new BookmarksNotConfiguredError(),
    new UpstreamNotConfiguredError("nope"),
  ]) {
    const reply = fakeReply();
    handleUpstreamError(err, reply as never);
    assert.equal(reply.sent.status, 503, `${err.name} should map to 503`);
    assert.deepEqual(reply.sent.body, {
      message: err.message,
    });
  }
});

test("every service's unavailable error maps to 502", () => {
  // Three unrelated integrations: the mapping comes from the shared base, not from per-route code.
  for (const err of [
    new BookmarksUnavailableError("host down"),
    new TatoebaUnavailableError("host down"),
    new MediaUnavailableError("host down"),
    new UpstreamUnavailableError("host down"),
  ]) {
    const reply = fakeReply();
    handleUpstreamError(err, reply as never);
    assert.equal(reply.sent.status, 502, `${err.name} should map to 502`);
  }
});

test("an unrelated error is rethrown rather than being swallowed as a 502", () => {
  const reply = fakeReply();
  assert.throws(
    () => handleUpstreamError(new TypeError("a real bug"), reply as never),
    TypeError,
  );
  assert.equal(reply.sent.status, undefined);
});

test("the specific error classes keep their own names and messages", () => {
  // The bases carry the HTTP mapping; the subclasses still identify which integration failed.
  assert.equal(new BookmarksNotConfiguredError().name, "BookmarksNotConfiguredError");
  assert.match(new BookmarksNotConfiguredError().message, /Bookmarks/);
  assert.ok(new BookmarksNotConfiguredError() instanceof UpstreamNotConfiguredError);
  assert.ok(new TatoebaUnavailableError("x") instanceof UpstreamUnavailableError);
});

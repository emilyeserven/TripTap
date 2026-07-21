import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { fetchJsonWithTimeout } from "@/services/http";

// Unit tests for the shared JSON-over-HTTP proxy helper. `fetch` is mocked, so no real host is
// contacted. The helper maps every recoverable failure mode to the caller-supplied error type.

/** Sentinel error type standing in for a service's own recoverable (502) error. */
class HostError extends Error {}
const makeError = (message: string): Error => new HostError(message);

/** Minimal `Response`-like stand-in for a mocked `fetch`. */
function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

afterEach(() => mock.restoreAll());

describe("fetchJsonWithTimeout", () => {
  it("defaults to a GET with an Accept header and no body when no options are given", async () => {
    let seenUrl = "";
    let seenInit: RequestInit = {};
    mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
      seenUrl = url;
      seenInit = init;
      return jsonResponse({
        ok: true,
      });
    });

    const body = await fetchJsonWithTimeout<{ ok: boolean }>(
      "https://host.test/x",
      {},
      "Host",
      makeError,
    );

    assert.deepEqual(body, {
      ok: true,
    });
    assert.equal(seenUrl, "https://host.test/x");
    assert.equal(seenInit.method, "GET");
    assert.equal((seenInit.headers as Record<string, string>).Accept, "application/json");
    assert.equal(seenInit.body, undefined);
  });

  it("sends a JSON POST with Content-Type when a body is present", async () => {
    let seenInit: RequestInit = {};
    mock.method(globalThis, "fetch", async (_url: string, init: RequestInit) => {
      seenInit = init;
      return jsonResponse({});
    });

    await fetchJsonWithTimeout("https://host.test/x", {
      body: {
        q: "hi",
      },
    }, "Host", makeError);

    assert.equal(seenInit.method, "POST");
    const headers = seenInit.headers as Record<string, string>;
    assert.equal(headers["Content-Type"], "application/json");
    assert.equal(seenInit.body, JSON.stringify({
      q: "hi",
    }));
  });

  it("respects an explicit method and merges caller headers over the defaults", async () => {
    let seenInit: RequestInit = {};
    mock.method(globalThis, "fetch", async (_url: string, init: RequestInit) => {
      seenInit = init;
      return jsonResponse({});
    });

    await fetchJsonWithTimeout(
      "https://host.test/x",
      {
        method: "PUT",
        headers: {
          Authorization: "Bearer t",
        },
      },
      "Host",
      makeError,
    );

    assert.equal(seenInit.method, "PUT");
    const headers = seenInit.headers as Record<string, string>;
    assert.equal(headers.Authorization, "Bearer t");
    assert.equal(headers.Accept, "application/json");
  });

  it("maps a thrown fetch (connection failure) to the caller's error type", async () => {
    mock.method(globalThis, "fetch", async () => {
      throw new Error("ECONNREFUSED");
    });

    await assert.rejects(
      () => fetchJsonWithTimeout("https://host.test/x", {}, "Bookmarks host", makeError),
      (err: Error) => {
        assert.ok(err instanceof HostError);
        assert.match(err.message, /Bookmarks host unreachable: ECONNREFUSED/);
        return true;
      },
    );
  });

  it("maps a non-2xx response to the caller's error type with the status", async () => {
    mock.method(globalThis, "fetch", async () => jsonResponse({}, false, 503));

    await assert.rejects(
      () => fetchJsonWithTimeout("https://host.test/x", {}, "Host", makeError),
      (err: Error) => {
        assert.ok(err instanceof HostError);
        assert.match(err.message, /Host returned 503/);
        return true;
      },
    );
  });

  it("maps an unparsable JSON body to the caller's error type", async () => {
    mock.method(globalThis, "fetch", async () =>
      ({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error("Unexpected token");
        },
      } as unknown as Response));

    await assert.rejects(
      () => fetchJsonWithTimeout("https://host.test/x", {}, "Host", makeError),
      (err: Error) => {
        assert.ok(err instanceof HostError);
        assert.match(err.message, /Host returned invalid JSON: Unexpected token/);
        return true;
      },
    );
  });
});

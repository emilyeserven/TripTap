/**
 * Service-worker-free update detection. Vite emits exactly one hashed entry bundle
 * (`<script type="module" crossorigin src="/assets/index-<hash>.js">`) per build, so comparing the
 * bundle the running app booted from against the one the server currently advertises tells us whether
 * a newer build has been deployed — without needing a service worker (which can't register on the
 * plain-HTTP LAN origins TripTap is self-hosted on).
 */

/** The hashed entry bundle this running app booted from, read from its own DOM. */
export function getLoadedEntry(doc: Document = document): string | null {
  return doc.querySelector("script[type=\"module\"][src^=\"/assets/\"]")?.getAttribute("src") ?? null;
}

/** Extract the entry bundle src from a served index.html. */
export function parseEntryFromHtml(html: string): string | null {
  return /<script[^>]*type="module"[^>]*src="(\/assets\/[^"]+\.js)"/.exec(html)?.[1] ?? null;
}

/** Fetch the currently-deployed index.html and return its entry bundle src. */
export async function fetchDeployedEntry(): Promise<string | null> {
  const html = await fetch("/", {
    cache: "no-store",
  }).then(r => (r.ok ? r.text() : ""));
  return parseEntryFromHtml(html);
}

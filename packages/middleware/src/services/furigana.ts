import type { FuriToken } from "@sentence-bank/types";

import KuroshiroImport from "kuroshiro";
import KuromojiAnalyzerImport from "kuroshiro-analyzer-kuromoji";

// CJS→ESM interop is inconsistent across these two packages: kuroshiro's real class hides under
// `.default`, the analyzer's does not. Unwrap defensively.
const Kuroshiro = (KuroshiroImport as unknown as { default?: typeof KuroshiroImport }).default
  ?? KuroshiroImport;
const KuromojiAnalyzer
  = (KuromojiAnalyzerImport as unknown as { default?: typeof KuromojiAnalyzerImport }).default
    ?? KuromojiAnalyzerImport;

/**
 * Auto-generated furigana. `kuroshiro` (a pure-JS MeCab tokenizer) converts Japanese text into ruby
 * HTML with correct okurigana alignment; we parse that into a compact token array so the client can
 * render `<ruby>` without trusting raw HTML. Readings are best-effort — analyzers misread proper
 * nouns and ambiguous words — so treat them as a starting point, not ground truth.
 */

type KuroshiroInstance = InstanceType<typeof Kuroshiro>;

let ready: Promise<KuroshiroInstance> | null = null;

/** Lazily initialize a shared kuroshiro instance (loads the dictionary once). */
function getKuroshiro(): Promise<KuroshiroInstance> {
  if (!ready) {
    ready = (async () => {
      const instance = new Kuroshiro();
      await instance.init(new KuromojiAnalyzer());
      return instance;
    })();
  }
  return ready;
}

const RUBY = /<ruby>(.*?)<rp>\(<\/rp><rt>(.*?)<\/rt><rp>\)<\/rp><\/ruby>/g;

/** Decode the handful of HTML entities kuroshiro may emit in text runs. */
function decode(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/** Parse kuroshiro furigana HTML into `{ t, r }` segments (r set only on kanji runs). */
function parse(html: string): FuriToken[] {
  const tokens: FuriToken[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  RUBY.lastIndex = 0;
  while ((m = RUBY.exec(html)) !== null) {
    if (m.index > last) {
      tokens.push({
        t: decode(html.slice(last, m.index)),
        r: null,
      });
    }
    tokens.push({
      t: decode(m[1]),
      r: decode(m[2]),
    });
    last = RUBY.lastIndex;
  }
  if (last < html.length) {
    tokens.push({
      t: decode(html.slice(last)),
      r: null,
    });
  }
  return tokens;
}

/**
 * Generate furigana tokens for a sentence. Returns `null` on empty text or if the analyzer fails
 * (generation is best-effort and must never block saving a sentence). A returned array with no `r`
 * fields simply means "no kanji to annotate".
 */
export async function generateFurigana(text: string): Promise<FuriToken[] | null> {
  if (!text.trim()) return null;
  try {
    const kuroshiro = await getKuroshiro();
    const html = await kuroshiro.convert(text, {
      mode: "furigana",
      to: "hiragana",
    });
    const tokens = parse(html);
    // If nothing needed a reading, store the tokens anyway so the row counts as "generated".
    return tokens.length > 0 ? tokens : null;
  }
  catch {
    return null;
  }
}

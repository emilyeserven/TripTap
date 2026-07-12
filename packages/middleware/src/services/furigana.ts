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
 * Apply user reading overrides (from the vocab bank) over analyzer output. Consecutive base runs are
 * greedily merged when they spell an override term (longest match wins), so a name the analyzer split
 * or mis-read is replaced by the user's reading. This is what lets names be "excluded from analysis":
 * add the term to vocab with its correct reading and it wins everywhere.
 */
export function applyOverrides(tokens: FuriToken[], overrides: Map<string, string>): FuriToken[] {
  if (overrides.size === 0) return tokens;
  const maxLen = Math.max(...[...overrides.keys()].map(k => k.length));
  const out: FuriToken[] = [];
  let i = 0;
  while (i < tokens.length) {
    let matchEnd = -1;
    let matchTerm = "";
    let acc = "";
    for (let j = i; j < tokens.length && acc.length < maxLen; j += 1) {
      acc += tokens[j].t;
      if (acc.length > maxLen) break;
      if (overrides.has(acc)) {
        matchEnd = j;
        matchTerm = acc;
      }
    }
    if (matchEnd >= 0) {
      out.push({
        t: matchTerm,
        r: overrides.get(matchTerm) ?? null,
      });
      i = matchEnd + 1;
    }
    else {
      out.push(tokens[i]);
      i += 1;
    }
  }
  return out;
}

/** Outcome of a furigana generation attempt. `error` is set only when the analyzer threw. */
export interface FuriganaResult {
  tokens: FuriToken[] | null;
  error: string | null;
}

/**
 * Generate furigana tokens for a sentence, with optional user reading overrides. Generation is
 * best-effort and must never block saving a sentence — on failure it returns `error` (so callers can
 * persist and surface it) rather than throwing. Empty text or no-kanji simply yields `tokens: null`.
 */
export async function generateFurigana(
  text: string,
  overrides?: Map<string, string>,
): Promise<FuriganaResult> {
  if (!text.trim()) {
    return {
      tokens: null,
      error: null,
    };
  }
  try {
    const kuroshiro = await getKuroshiro();
    const html = await kuroshiro.convert(text, {
      mode: "furigana",
      to: "hiragana",
    });
    const tokens = overrides && overrides.size > 0
      ? applyOverrides(parse(html), overrides)
      : parse(html);
    return {
      // If nothing needed a reading, store the tokens anyway so the row counts as "generated".
      tokens: tokens.length > 0 ? tokens : null,
      error: null,
    };
  }
  catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      tokens: null,
      error: message.slice(0, 500),
    };
  }
}

// Minimal ambient types for the untyped kuroshiro furigana libraries.
declare module "kuroshiro" {
  export default class Kuroshiro {
    init(analyzer: unknown): Promise<void>;
    convert(
      text: string,
      options?: { mode?: "normal" | "spaced" | "okurigana" | "furigana";
        to?: "hiragana" | "katakana" | "romaji"; },
    ): Promise<string>;
  }
}

declare module "kuroshiro-analyzer-kuromoji" {
  export default class KuromojiAnalyzer {
    constructor(options?: { dictPath?: string });
  }
}

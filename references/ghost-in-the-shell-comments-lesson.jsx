import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from "react";

import {
  Sparkles, Clapperboard, Music, History, BookOpen, GraduationCap,
  MessageSquare, RefreshCw, Volume2, ChevronDown, Check, RotateCcw,
  Type, ArrowRight, Ghost, Cpu, Youtube, Play,
} from "lucide-react";

/* ────────────────────────────────────────────────────────────────
   SOURCE
   15 real top-level comments on the non-credit OP for
   『攻殻機動隊 THE GHOST IN THE SHELL』(King Gnu「GO GHOST」)
   https://www.youtube.com/watch?v=FhzaLI_Npg8
   Comment text is verbatim; translations & breakdowns are mine.
   ──────────────────────────────────────────────────────────────── */

const VIDEO_URL = "https://www.youtube.com/watch?v=FhzaLI_Npg8";

/* ── VOCAB ──────────────────────────────────────────────────────── */
const VOCAB = [
  // アニメ / anime & production
  {
    jp: "攻殻機動隊",
    yomi: "こうかくきどうたい",
    en: "Ghost in the Shell (lit. 'shell riot-police squad')",
    lvl: "title",
    cat: "anime",
  },
  {
    jp: "原作",
    yomi: "げんさく",
    en: "the original work (source manga)",
    lvl: "N2",
    cat: "anime",
  },
  {
    jp: "作品",
    yomi: "さくひん",
    en: "a work (of art / media)",
    lvl: "N4",
    cat: "anime",
  },
  {
    jp: "少佐",
    yomi: "しょうさ",
    en: "Major (rank; here, Motoko Kusanagi)",
    lvl: "N1",
    cat: "anime",
  },
  {
    jp: "義体",
    yomi: "ぎたい",
    en: "prosthetic (cyborg) body",
    lvl: "jargon",
    cat: "anime",
  },
  {
    jp: "電脳",
    yomi: "でんのう",
    en: "cyberbrain, cyber-brain",
    lvl: "jargon",
    cat: "anime",
  },
  {
    jp: "フチコマ",
    yomi: "ふちこま",
    en: "Fuchikoma (the think-tank robots)",
    lvl: "jargon",
    cat: "anime",
  },
  {
    jp: "演出",
    yomi: "えんしゅつ",
    en: "direction, staging (of a production)",
    lvl: "N2",
    cat: "anime",
  },
  {
    jp: "作画",
    yomi: "さくが",
    en: "the animation art / drawing",
    lvl: "jargon",
    cat: "anime",
  },
  {
    jp: "制作陣",
    yomi: "せいさくじん",
    en: "the production staff / team",
    lvl: "N2",
    cat: "anime",
  },
  {
    jp: "セリフ",
    yomi: "せりふ",
    en: "lines, dialogue",
    lvl: "N3",
    cat: "anime",
  },
  {
    jp: "キャラ",
    yomi: "きゃら",
    en: "character (short for キャラクター)",
    lvl: "N3",
    cat: "anime",
  },
  {
    jp: "アクション",
    yomi: "あくしょん",
    en: "action (scenes)",
    lvl: "N4",
    cat: "anime",
  },
  {
    jp: "映像化",
    yomi: "えいぞうか",
    en: "adaptation into film / video",
    lvl: "jargon",
    cat: "anime",
  },
  {
    jp: "踏襲",
    yomi: "とうしゅう",
    en: "following / adhering to (a precedent)",
    lvl: "N1",
    cat: "anime",
  },

  // ネット / net & slang
  {
    jp: "ゴースト",
    yomi: "ごーすと",
    en: "'ghost' — the self / soul in a cyber-body",
    lvl: "jargon",
    cat: "net",
  },
  {
    jp: "囁く",
    yomi: "ささやく",
    en: "to whisper",
    lvl: "N2",
    cat: "net",
  },
  {
    jp: "めっちゃ",
    yomi: "めっちゃ",
    en: "super, really (very casual)",
    lvl: "slang",
    cat: "net",
  },
  {
    jp: "超",
    yomi: "ちょう",
    en: "super-, ultra- (casual intensifier)",
    lvl: "N3",
    cat: "net",
  },
  {
    jp: "やっぱ",
    yomi: "やっぱ",
    en: "after all / as expected (casual やっぱり)",
    lvl: "N3",
    cat: "net",
  },
  {
    jp: "味がする",
    yomi: "あじがする",
    en: "to have flavor; (fig.) to still be worth savoring",
    lvl: "idiom",
    cat: "net",
  },
  {
    jp: "コメント",
    yomi: "こめんと",
    en: "a comment",
    lvl: "N4",
    cat: "net",
  },

  // 音楽 / music
  {
    jp: "オープニング",
    yomi: "おーぷにんぐ",
    en: "opening (OP)",
    lvl: "N4",
    cat: "music",
  },
  {
    jp: "主題歌",
    yomi: "しゅだいか",
    en: "theme song",
    lvl: "N2",
    cat: "music",
  },
  {
    jp: "歌詞",
    yomi: "かし",
    en: "lyrics",
    lvl: "N2",
    cat: "music",
  },
  {
    jp: "サビ",
    yomi: "さび",
    en: "the hook / chorus of a song",
    lvl: "jargon",
    cat: "music",
  },
  {
    jp: "イントロ",
    yomi: "いんとろ",
    en: "intro (introduction of a song)",
    lvl: "N3",
    cat: "music",
  },
  {
    jp: "ベース",
    yomi: "べーす",
    en: "bass (guitar / line)",
    lvl: "N3",
    cat: "music",
  },
  {
    jp: "曲",
    yomi: "きょく",
    en: "song, tune, track",
    lvl: "N4",
    cat: "music",
  },

  // 時代 / era & meta
  {
    jp: "令和",
    yomi: "れいわ",
    en: "Reiwa era (2019– )",
    lvl: "domain",
    cat: "era",
  },
  {
    jp: "昭和",
    yomi: "しょうわ",
    en: "Showa era (1926–1989)",
    lvl: "domain",
    cat: "era",
  },
  {
    jp: "今期",
    yomi: "こんき",
    en: "this (anime) season / term",
    lvl: "N2",
    cat: "era",
  },
  {
    jp: "時代",
    yomi: "じだい",
    en: "era, period, the times",
    lvl: "N4",
    cat: "era",
  },
  {
    jp: "準拠",
    yomi: "じゅんきょ",
    en: "conformity to; being based on",
    lvl: "N1",
    cat: "era",
  },
  {
    jp: "雰囲気",
    yomi: "ふんいき",
    en: "atmosphere, mood, vibe",
    lvl: "N3",
    cat: "era",
  },
];
const VOCAB_MAP = Object.fromEntries(VOCAB.map(v => [v.jp, v]));

/* ── CATS ───────────────────────────────────────────────────────── */
const CATS = {
  all: {
    jp: "すべて",
    en: "All",
    icon: Sparkles,
  },
  anime: {
    jp: "作品",
    en: "Anime",
    icon: Clapperboard,
  },
  net: {
    jp: "ネット",
    en: "Net slang",
    icon: MessageSquare,
  },
  music: {
    jp: "音楽",
    en: "Music",
    icon: Music,
  },
  era: {
    jp: "時代",
    en: "Era & meta",
    icon: History,
  },
};

/* ── GRAMMAR ────────────────────────────────────────────────────── */
const GRAMMAR = [
  {
    pat: "〜すぎる",
    gloss: "too ~ / excessively ~",
    note: "Attach すぎる to a verb-stem or the stem of an adjective to mean 'too much.' 良い→良すぎる (too good), 気持ちいい→気持ちよすぎる (feels too good). In comment speech it is pure hyperbole — a compliment, not a complaint. The 〜て form すぎて then chains it into a reason: 'so good that...'.",
    ex: [
      {
        jp: "曲が良すぎる。",
        en: "The song is too good.",
      },
      {
        jp: "イントロのベースが気持ちよすぎてゴーストが喜んでる。",
        en: "The intro's bass feels so good my ghost is rejoicing.",
      },
      {
        jp: "面白すぎて一気に見ちゃった。",
        en: "It was so interesting I binged it in one go.",
      },
    ],
  },
  {
    pat: "〜けど",
    gloss: "but / though / and (soft connector)",
    note: "けど is the casual cousin of けれど・が. It marks contrast ('but'), but is also used as a gentle, non-committal link — softening a statement or just letting a thought trail on. Comment writers lean on it constantly to sound relaxed rather than argumentative.",
    ex: [
      {
        jp: "攻殻機動隊見たことないけど、面白い。",
        en: "I've never seen Ghost in the Shell, but it's good.",
      },
      {
        jp: "1話5回見たけどまだ味がする。",
        en: "I've watched episode 1 five times but it still has flavor.",
      },
      {
        jp: "原作は読んでたけど、若い頃はアニメを観てなかった。",
        en: "I'd read the manga, but when I was young I didn't watch the anime.",
      },
    ],
  },
  {
    pat: "可能形 (〜れる / 〜られる)",
    gloss: "potential form: can / be able to ~",
    note: "The potential form says you CAN do something. 見る→見られる, 楽しむ→楽しめる, 味わう→味わえる. Casual speech often drops the ら (ら抜き言葉): 見られる→見れる, 観られる→観れる. You will see 観れて all over these comments — technically 観られて, but the shortened form is now the norm online.",
    ex: [
      {
        jp: "令和になって原作準拠の攻殻が観れて最高。",
        en: "In the Reiwa era we can watch a faithful Ghost in the Shell — the best.",
      },
      {
        jp: "マンガを読むと更に楽しめるよ。",
        en: "If you read the manga you can enjoy it even more.",
      },
      {
        jp: "原作絵の動く攻殻が見れるなんて。",
        en: "To think we can see Ghost in the Shell move in the manga's own art style…",
      },
    ],
  },
  {
    pat: "〜てくれる",
    gloss: "to do ~ (for me / us) — a favor",
    note: "The 〜てくれる auxiliary frames an action as a favor done for the speaker's side. 作ってくれて = 'made it (for us),' with warmth and gratitude built in. It usually pairs with ありがとう. Note the direction: くれる = toward me; あげる = away from me.",
    ex: [
      {
        jp: "しっかり作ってくれてありがとう。",
        en: "Thank you for making it so carefully (for us).",
      },
      {
        jp: "原作を踏襲してくれて嬉しい。",
        en: "I'm happy they stayed faithful to the original (for us).",
      },
      {
        jp: "続きを早く見せてくれ。",
        en: "Show us the next part soon! (blunt request form)",
      },
    ],
  },
  {
    pat: "引用の って / と",
    gloss: "quotative: '...' — labeling a phrase or feeling",
    note: "と (formal) and って (casual) mark quoted words, thoughts, or labels. 「時代が追いついた」って言葉 = 'the phrase “the times caught up.”' It also tags a feeling: 〜って感じだ ('it feels like ~'), and reports perception: 面白いと囁いてる ('whispers that it is interesting').",
    ex: [
      {
        jp: "「時代が追いついた」って言葉が相応しい。",
        en: "The phrase 'the times have caught up' fits perfectly.",
      },
      {
        jp: "このアニメは面白いとゴーストが囁いてる。",
        en: "My ghost whispers that this anime is good.",
      },
      {
        jp: "ようやくなったって感じだ。",
        en: "It feels like we've finally gotten there.",
      },
    ],
  },
];

/* ── SOURCE (the 15 comments) ───────────────────────────────────── */
const SOURCE = [
  {
    jp: "曲が良すぎる",
    en: "The song is way too good.",
    where: "@suzu-momoharu · 4 likes",
    url: VIDEO_URL,
    grammar: [
      {
        p: "〜すぎる",
        d: "Adjective stem 良 + すぎる = 'too good.' Here it is praise, not a complaint.",
      },
    ],
    vocab: [
      {
        w: "曲",
        y: "きょく",
        m: "song, track",
        lvl: "N4",
      },
    ],
  },
  {
    jp: "今期すごいアニメ多くない？",
    en: "Aren't there a ton of amazing anime this season?",
    where: "@dream-hm9nw · 10 likes",
    url: VIDEO_URL,
    grammar: [
      {
        p: "〜ない？",
        d: "A negative used as a tag question — 'right? / don't you think?' Seeks agreement, not literally negative.",
      },
    ],
    vocab: [
      {
        w: "今期",
        y: "こんき",
        m: "this season / term",
        lvl: "N2",
      },
      {
        w: "多い",
        y: "おおい",
        m: "many, numerous",
        lvl: "N5",
      },
    ],
  },
  {
    jp: "超良かったな！続き楽しみ🔌",
    en: "That was super good! Can't wait for the next one. 🔌",
    where: "@ukimusya · 15 likes",
    url: VIDEO_URL,
    grammar: [
      {
        p: "超〜",
        d: "Casual intensifier prefix, 'super / ultra.' 超良かった = 'super good.'",
      },
      {
        p: "〜な (終助詞)",
        d: "Sentence-final な voicing personal feeling / mild exclamation.",
      },
    ],
    vocab: [
      {
        w: "超",
        y: "ちょう",
        m: "super-, ultra- (casual)",
        lvl: "N3",
      },
      {
        w: "続き",
        y: "つづき",
        m: "continuation, the next part",
        lvl: "N3",
      },
      {
        w: "楽しみ",
        y: "たのしみ",
        m: "looking forward to it",
        lvl: "N4",
      },
    ],
  },
  {
    jp: "令和になって原作準拠の攻殻が観れてしかもめっちゃクオリティ高いとか最高かよ",
    en: "Now that it's the Reiwa era we get a Ghost in the Shell that's faithful to the manga — and on top of that the quality is insanely high? This is the best.",
    where: "@summeroil-suguru · 960 likes",
    url: VIDEO_URL,
    grammar: [
      {
        p: "〜になって",
        d: "'now that it has become ~ / since ~.' 令和になって = 'now that it's Reiwa.'",
      },
      {
        p: "観れて (ら抜き可能形)",
        d: "Casual potential of 観る (=観られて), 'being able to watch.'",
      },
      {
        p: "〜とか…かよ",
        d: "Casual exclamatory frame — 'stuff like ~, seriously?' expressing delighted disbelief.",
      },
    ],
    vocab: [
      {
        w: "準拠",
        y: "じゅんきょ",
        m: "based on, conforming to",
        lvl: "N1",
      },
      {
        w: "しかも",
        y: "しかも",
        m: "moreover, on top of that",
        lvl: "N3",
      },
      {
        w: "めっちゃ",
        y: "めっちゃ",
        m: "super, really (slang)",
        lvl: "slang",
      },
      {
        w: "最高",
        y: "さいこう",
        m: "the best, awesome",
        lvl: "N3",
      },
    ],
  },
  {
    jp: "攻殻機動隊見たことないけど、このアニメは面白いとゴーストが囁いてる",
    en: "I've never seen Ghost in the Shell, but my ghost is whispering that this anime is good.",
    where: "@ryu-e9k · 82 likes",
    url: VIDEO_URL,
    grammar: [
      {
        p: "〜たことない",
        d: "'have never done ~.' 見たことない = 'have never watched.'",
      },
      {
        p: "〜けど",
        d: "Soft 'but,' linking the contrast between never having seen it and sensing it's good.",
      },
      {
        p: "〜と (引用)",
        d: "Quotative と marking what the ghost 'whispers.' A playful nod to the show's theme.",
      },
    ],
    vocab: [
      {
        w: "面白い",
        y: "おもしろい",
        m: "interesting, fun",
        lvl: "N5",
      },
      {
        w: "ゴースト",
        y: "ごーすと",
        m: "'ghost' (self / soul)",
        lvl: "jargon",
      },
      {
        w: "囁く",
        y: "ささやく",
        m: "to whisper",
        lvl: "N2",
      },
    ],
  },
  {
    jp: "1話5回見たけどまだ味がする",
    en: "I've watched episode 1 five times but it still has flavor (I'm still getting something out of it).",
    where: "@user-gp4fl2ic9i · 7 likes",
    url: VIDEO_URL,
    grammar: [
      {
        p: "〜けど",
        d: "Casual 'but' — contrasts many rewatches with the fact it hasn't gone stale.",
      },
      {
        p: "まだ〜",
        d: "'still ~.' まだ味がする = 'still has flavor.'",
      },
    ],
    vocab: [
      {
        w: "話",
        y: "わ",
        m: "counter for episodes (1話 = ep. 1)",
        lvl: "N4",
      },
      {
        w: "回",
        y: "かい",
        m: "counter for times / occurrences",
        lvl: "N5",
      },
      {
        w: "味がする",
        y: "あじがする",
        m: "to have flavor; still worth savoring",
        lvl: "idiom",
      },
    ],
  },
  {
    jp: "イントロのベースが気持ちよすぎてゴーストが喜んでる",
    en: "The intro's bassline feels so good that my ghost is rejoicing.",
    where: "@ゆうさく-d9j · 17 likes",
    url: VIDEO_URL,
    grammar: [
      {
        p: "〜すぎて",
        d: "'so ~ that / because too ~.' 気持ちよすぎて chains the reason into the next clause.",
      },
      {
        p: "〜てる",
        d: "Contracted 〜ている progressive: 喜んでる = 'is rejoicing.'",
      },
    ],
    vocab: [
      {
        w: "イントロ",
        y: "いんとろ",
        m: "intro (of a song)",
        lvl: "N3",
      },
      {
        w: "ベース",
        y: "べーす",
        m: "bass (line / guitar)",
        lvl: "N3",
      },
      {
        w: "気持ちいい",
        y: "きもちいい",
        m: "feels good, pleasant",
        lvl: "N4",
      },
      {
        w: "喜ぶ",
        y: "よろこぶ",
        m: "to be glad, to rejoice",
        lvl: "N4",
      },
    ],
  },
  {
    jp: "面白かった。アクションでしっかり動くし、素子の原作の大事なセリフもしっかりあってよかった。",
    en: "It was great. The animation really moves in the action scenes, and the important lines from Motoko's original manga were there too — I'm glad.",
    where: "@ortega-h9z · 14 likes",
    url: VIDEO_URL,
    grammar: [
      {
        p: "〜し",
        d: "Lists reasons/facts: 'it does A, and (also) B.' 動くし = 'it moves, and…'.",
      },
      {
        p: "〜てよかった",
        d: "'I'm glad that ~.' あってよかった = 'glad it was there.'",
      },
    ],
    vocab: [
      {
        w: "しっかり",
        y: "しっかり",
        m: "firmly, properly, solidly",
        lvl: "N3",
      },
      {
        w: "大事",
        y: "だいじ",
        m: "important, precious",
        lvl: "N4",
      },
      {
        w: "セリフ",
        y: "せりふ",
        m: "lines, dialogue",
        lvl: "N3",
      },
    ],
  },
  {
    jp: "この作品のすごい所は、マンガをしっかり読むと更に楽しめるよ、というのが随所に感じられる所",
    en: "What's amazing about this work is that you can feel, all over the place, the message: 'read the manga carefully and you'll enjoy it even more.'",
    where: "@TTxtc · 45 likes",
    url: VIDEO_URL,
    grammar: [
      {
        p: "〜と (条件)",
        d: "Conditional と: 'when / if you read...' 読むと = 'if you read.'",
      },
      {
        p: "楽しめる",
        d: "Potential of 楽しむ, 'can enjoy.'",
      },
      {
        p: "というのが",
        d: "Wraps the quoted idea into a noun: 'the thing that ~.'",
      },
      {
        p: "感じられる",
        d: "Potential/passive of 感じる: 'can be felt.'",
      },
    ],
    vocab: [
      {
        w: "作品",
        y: "さくひん",
        m: "a work (of media)",
        lvl: "N4",
      },
      {
        w: "更に",
        y: "さらに",
        m: "even more, furthermore",
        lvl: "N2",
      },
      {
        w: "随所",
        y: "ずいしょ",
        m: "everywhere, in many places",
        lvl: "N1",
      },
    ],
  },
  {
    jp: "原作をちゃんと踏襲しながら、ハラハラする演出までしっかり作ってくれてありがとう。最高！",
    en: "Thank you for faithfully following the original while also carefully making even the nail-biting direction. The best!",
    where: "@lolololololo3601 · 27 likes",
    url: VIDEO_URL,
    grammar: [
      {
        p: "〜ながら",
        d: "'while doing ~.' 踏襲しながら = 'while adhering (to the original).'",
      },
      {
        p: "〜まで",
        d: "'even ~.' 演出まで = 'even the direction.'",
      },
      {
        p: "〜てくれて",
        d: "Favor auxiliary: 'doing ~ for us,' pairing with ありがとう.",
      },
    ],
    vocab: [
      {
        w: "踏襲",
        y: "とうしゅう",
        m: "following, adhering to",
        lvl: "N1",
      },
      {
        w: "ハラハラ",
        y: "はらはら",
        m: "on-edge, nervous (mimetic)",
        lvl: "N2",
      },
      {
        w: "演出",
        y: "えんしゅつ",
        m: "direction, staging",
        lvl: "N2",
      },
    ],
  },
  {
    jp: "やっぱ少佐は押井世界のクール一辺倒より原作よりのエモーショナルな方が好きだわ　なにより可愛い",
    en: "After all, I prefer a Major who's emotional and closer to the manga over the all-cool Oshii-world version. Above all — she's cute.",
    where: "@zuruzurub · 15 likes",
    url: VIDEO_URL,
    grammar: [
      {
        p: "やっぱ",
        d: "Casual やっぱり: 'after all / as I thought.'",
      },
      {
        p: "AよりBの方が好き",
        d: "Comparison: 'prefer B over A.'",
      },
      {
        p: "〜だわ",
        d: "Sentence-final わ softening the assertion, adding personal feel.",
      },
    ],
    vocab: [
      {
        w: "少佐",
        y: "しょうさ",
        m: "Major (rank; Motoko)",
        lvl: "N1",
      },
      {
        w: "一辺倒",
        y: "いっぺんとう",
        m: "exclusively one way, all-in on one thing",
        lvl: "N1",
      },
      {
        w: "なにより",
        y: "なにより",
        m: "above all, more than anything",
        lvl: "N2",
      },
    ],
  },
  {
    jp: "まさに「時代が追いついた」って言葉が相応しいね。表現も視聴者も、攻殻機動隊という作品を味わうことができる時代にようやくなったって感じだ",
    en: "The phrase 'the times have caught up' really is fitting. It feels like we've finally reached an era where both the craft and the audience can savor a work like Ghost in the Shell.",
    where: "@lazycrazy1007 · 159 likes",
    url: VIDEO_URL,
    grammar: [
      {
        p: "〜って (引用)",
        d: "Casual quotative marking 「時代が追いついた」 as a labeled phrase, and 〜って感じ = 'it feels like.'",
      },
      {
        p: "〜ことができる",
        d: "Formal potential: 'be able to ~.' 味わうことができる = 'can savor.'",
      },
      {
        p: "ようやく〜なった",
        d: "'have finally become ~.'",
      },
    ],
    vocab: [
      {
        w: "追いつく",
        y: "おいつく",
        m: "to catch up",
        lvl: "N2",
      },
      {
        w: "相応しい",
        y: "ふさわしい",
        m: "fitting, suitable",
        lvl: "N1",
      },
      {
        w: "味わう",
        y: "あじわう",
        m: "to savor, to appreciate",
        lvl: "N2",
      },
    ],
  },
  {
    jp: "押井守、神山健治、黄瀬和哉…これまで携わったクリエーターたちは皆どこか作家性が強調されてたけど、今回の攻殻機動隊は士郎正宗の原作コミックの雰囲気が全面に押し出されていて…控えめに言って最高だった",
    en: "Oshii Mamoru, Kamiyama Kenji, Kise Kazuchika… the creators involved so far all had their authorial voice foregrounded somewhere, but this time Ghost in the Shell pushes Shirow Masamune's manga atmosphere fully to the front… to put it mildly, it was the best.",
    where: "@May-pp7tj · 481 likes",
    url: VIDEO_URL,
    grammar: [
      {
        p: "〜たち",
        d: "Plural for people: クリエーターたち = 'the creators.'",
      },
      {
        p: "強調されてた (受身)",
        d: "Passive of 強調する + past progressive: 'was being emphasized.'",
      },
      {
        p: "控えめに言って",
        d: "Set phrase: 'to put it mildly / understating it.'",
      },
    ],
    vocab: [
      {
        w: "携わる",
        y: "たずさわる",
        m: "to be involved in (work)",
        lvl: "N1",
      },
      {
        w: "作家性",
        y: "さっかせい",
        m: "authorial voice / individuality",
        lvl: "jargon",
      },
      {
        w: "雰囲気",
        y: "ふんいき",
        m: "atmosphere, mood",
        lvl: "N3",
      },
    ],
  },
  {
    jp: "いい歳とった昭和のオッサンだけど、原作踏襲のアニメ作品が出るとは夢にも思わなったし、原作は読んでたけど若い頃はアニメ自体を観てなかった",
    en: "I'm a Showa-era old man well on in years, but I never even dreamed a faithful anime adaptation would come out — and though I'd read the manga, I didn't watch the anime itself when I was young.",
    where: "@木田太郎-z5w · 182 likes",
    url: VIDEO_URL,
    grammar: [
      {
        p: "〜とは思わなかった",
        d: "'never thought / dreamed that ~.' (思わなった here is a casual slip for 思わなかった.)",
      },
      {
        p: "夢にも〜ない",
        d: "'not even in one's dreams,' emphasizing total surprise.",
      },
      {
        p: "〜し",
        d: "Lists linked reasons/facts across the sentence.",
      },
    ],
    vocab: [
      {
        w: "昭和",
        y: "しょうわ",
        m: "Showa era (1926–89)",
        lvl: "domain",
      },
      {
        w: "オッサン",
        y: "おっさん",
        m: "middle-aged guy (casual)",
        lvl: "slang",
      },
      {
        w: "自体",
        y: "じたい",
        m: "itself, in itself",
        lvl: "N2",
      },
    ],
  },
  {
    jp: "コンピューターを用いたテクノロジーがアニメーションに導入されデジタル化が押し進んだ今日。士郎正宗版のオリジナル攻殻を映像化するにふさわしい時代と情報が行き交う環境になった感がある。",
    en: "Today, technology using computers has been introduced into animation and digitization has pushed forward. It feels like we've reached an era — and an environment where information flows back and forth — fitting to adapt Shirow Masamune's original Ghost in the Shell to screen.",
    where: "@dusttodust2324 · 28 likes",
    url: VIDEO_URL,
    grammar: [
      {
        p: "〜を用いた",
        d: "Formal/written 'using ~' (= を使った). 用いた modifies テクノロジー.",
      },
      {
        p: "導入され (受身)",
        d: "Passive: 'is introduced / adopted.'",
      },
      {
        p: "〜にふさわしい",
        d: "'fitting / suitable for ~.'",
      },
      {
        p: "〜感がある",
        d: "'there's a sense / feeling that ~.'",
      },
    ],
    vocab: [
      {
        w: "用いる",
        y: "もちいる",
        m: "to use, employ (formal)",
        lvl: "N2",
      },
      {
        w: "導入",
        y: "どうにゅう",
        m: "introduction, adoption",
        lvl: "N2",
      },
      {
        w: "映像化",
        y: "えいぞうか",
        m: "adaptation into film/video",
        lvl: "jargon",
      },
      {
        w: "行き交う",
        y: "ゆきかう",
        m: "to come and go, flow back and forth",
        lvl: "N1",
      },
    ],
  },
];

/* ── CULTURE ────────────────────────────────────────────────────── */
const CULTURE = [
  {
    icon: Clapperboard,
    jp: "攻殻機動隊とは",
    en: "What Ghost in the Shell is",
    body: "Ghost in the Shell (攻殻機動隊) began as Shirow Masamune's 1989 cyberpunk manga about Public Security Section 9 and its cyborg leader, Major Motoko Kusanagi (草薙素子・少佐). Past screen versions — Oshii's films, Kamiyama's Stand Alone Complex — each bent it to their own style. Commenters here are electrified that this new TV series is 原作準拠: faithful to the source manga's look and lines. Watch for the word 少佐 ('the Major') used as a term of endearment.",
    terms: ["攻殻機動隊", "原作", "少佐", "義体"],
  },
  {
    icon: Ghost,
    jp: "「ゴースト」という概念",
    en: "The concept of the 'ghost'",
    body: "In this world people have cyberbrains (電脳) and prosthetic bodies (義体); the 'ghost' is the ineffable self — soul, consciousness, gut instinct — that persists inside the shell. The famous line is 'my ghost is whispering to me.' Fans lovingly recycle it in the comments: ゴーストが囁いてる ('my ghost whispers it's good'), ゴーストが喜んでる ('my ghost rejoices'). Knowing the joke unlocks half the thread.",
    terms: ["ゴースト", "電脳", "囁く", "義体"],
  },
  {
    icon: Music,
    jp: "King Gnu「GO GHOST」",
    en: "The King Gnu opening theme",
    body: "This clip is the non-credit opening (ノンクレジットオープニング) set to King Gnu's theme song 主題歌 'GO GHOST,' written and composed by Daiki Tsuneta. Music comments zoom in on the イントロ, the ベース line, the サビ (hook), and the 歌詞 (lyrics). When someone says 曲が良すぎる, they mean this track.",
    terms: ["オープニング", "主題歌", "歌詞", "サビ"],
  },
  {
    icon: MessageSquare,
    jp: "YouTubeコメントの言葉",
    en: "The language of YouTube comments",
    body: "Comment Japanese is its own dialect: intensifiers めっちゃ / 超, clipped やっぱ (=やっぱり), the exclamatory tail 〜かよ, soft 〜わ, and the ら-dropped potential 観れる. People also frame time by imperial era — a 昭和 old-timer marveling that in 令和 this exists. The idiom 味がする ('still has flavor') is pure fandom slang for 'I keep rewatching and still enjoy it.'",
    terms: ["めっちゃ", "超", "令和", "味がする"],
  },
];

/* ── TABS ───────────────────────────────────────────────────────── */
const TABS = [
  {
    id: "culture",
    jp: "文化",
    en: "Context",
    icon: Ghost,
  },
  {
    id: "vocab",
    jp: "単語",
    en: "Vocabulary",
    icon: BookOpen,
  },
  {
    id: "grammar",
    jp: "文法",
    en: "Grammar",
    icon: GraduationCap,
  },
  {
    id: "source",
    jp: "原文",
    en: "The comments",
    icon: MessageSquare,
  },
  {
    id: "practice",
    jp: "練習",
    en: "Practice",
    icon: RefreshCw,
  },
];

/* ────────────────────────────────────────────────────────────────
   Furigana context + helpers
   ──────────────────────────────────────────────────────────────── */
const FuriganaCtx = createContext(true);
const useFurigana = () => useContext(FuriganaCtx);

function Furi({
  kanji, yomi,
}) {
  const show = useFurigana();
  if (show && yomi) return (
    <ruby>
      {kanji}
      <rt className="hg-rt">{yomi}</rt>
    </ruby>
  );
  return <span>{kanji}</span>;
}

function speak(text) {
  try {
    if (window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ja-JP"; u.rate = 0.85;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    }
  }
  catch (_) {}
}

function LevelBadge({
  lvl,
}) {
  const jlpt = /^N[1-5]$/.test(lvl);
  return (
    <span
      className="hg-badge"
      data-jlpt={jlpt ? "yes" : "no"}
    >{lvl}
    </span>
  );
}

/* ── VocabPill (culture chips w/ popover) ───────────────────────── */
function VocabPill({
  term,
}) {
  const v = VOCAB_MAP[term];
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState("above");
  const wrapRef = useRef(null);
  const hideTimer = useRef(null);
  const showFuri = useFurigana();

  const reveal = () => {
    clearTimeout(hideTimer.current);
    const r = wrapRef.current?.getBoundingClientRect();
    setPos(r && r.top < 130 ? "below" : "above");
    setOpen(true);
  };
  const hide = () => { hideTimer.current = setTimeout(() => setOpen(false), 120); };

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (!v) return <span className="hg-chip">{term}</span>;

  return (
    <span
      className="hg-pill-wrap"
      ref={wrapRef}
      onMouseEnter={reveal}
      onMouseLeave={hide}
      onFocus={reveal}
      onBlur={hide}
    >
      <button
        className="hg-chip"
        onClick={() => { reveal(); speak(v.jp); }}
      >
        {showFuri
          ? (
            <Furi
              kanji={v.jp}
              yomi={v.yomi}
            />
          )
          : v.jp}
      </button>
      {open && (
        <span
          className="hg-popover"
          data-pos={pos}
          onMouseEnter={() => clearTimeout(hideTimer.current)}
          onMouseLeave={hide}
        >
          <span className="hg-pop-jp">
            {showFuri
              ? (
                <ruby>
                  {v.jp}
                  <rt className="hg-rt pop">{v.yomi}</rt>
                </ruby>
              )
              : v.jp}
          </span>
          <span className="hg-pop-yomi">{v.yomi}</span>
          <span className="hg-pop-en">{v.en}</span>
          <LevelBadge lvl={v.lvl} />
        </span>
      )}
    </span>
  );
}

/* ── Culture pane ───────────────────────────────────────────────── */
function Culture() {
  return (
    <div className="hg-pane">
      <p className="hg-lede">
        A Japanese lesson mined from 15 real YouTube comments on the non-credit opening of
        『攻殻機動隊 THE GHOST IN THE SHELL』(King Gnu's “GO GHOST”). Start here for the
        cultural in-jokes, then work through the vocabulary, grammar, and the comments themselves.
      </p>
      <div className="hg-culture-grid">
        {CULTURE.map((c) => {
          const Icon = c.icon;
          return (
            <div
              className="hg-culture-card"
              key={c.jp}
            >
              <div className="hg-culture-head">
                <div className="hg-culture-icon">
                  <Icon size={19} />
                </div>
                <div>
                  <p className="hg-culture-jp">{c.jp}</p>
                  <span className="hg-culture-en">{c.en}</span>
                </div>
              </div>
              <p className="hg-culture-body">{c.body}</p>
              <div className="hg-chips">
                {c.terms.map(t => (
                  <VocabPill
                    key={t}
                    term={t}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Vocab pane ─────────────────────────────────────────────────── */
function FlipCard({
  v,
}) {
  const [flipped, setFlipped] = useState(false);
  const showFuri = useFurigana();
  return (
    <div
      className="hg-flip"
      data-flipped={flipped}
      tabIndex={0}
      onClick={() => { setFlipped(f => !f); speak(v.jp); }}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFlipped(f => !f); } }}
    >
      <div className="hg-flip-inner">
        <div className="hg-face hg-front">
          <span className="hg-vocab-jp">
            {showFuri
              ? (
                <Furi
                  kanji={v.jp}
                  yomi={v.yomi}
                />
              )
              : v.jp}
          </span>
          <LevelBadge lvl={v.lvl} />
        </div>
        <div className="hg-face hg-back">
          <span className="hg-back-yomi">{v.yomi}</span>
          <span className="hg-back-en">{v.en}</span>
          <LevelBadge lvl={v.lvl} />
        </div>
      </div>
    </div>
  );
}

function Vocab() {
  const [cat, setCat] = useState("all");
  const list = cat === "all" ? VOCAB : VOCAB.filter(v => v.cat === cat);
  return (
    <div className="hg-pane">
      <p className="hg-hint">Tap a card to flip it and hear the word. Orange badges mark words above the JLPT N2 line (or genre jargon) — the “glossary” for tricky terms.</p>
      <div className="hg-filter">
        {Object.entries(CATS).map(([k, c]) => {
          const Icon = c.icon;
          return (
            <button
              key={k}
              className="hg-filter-btn"
              data-active={cat === k}
              onClick={() => setCat(k)}
            >
              <Icon size={14} />
              {" "}
              <span>{c.en}</span>
            </button>
          );
        })}
      </div>
      <div className="hg-cardgrid">
        {list.map(v => (
          <FlipCard
            key={v.jp}
            v={v}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Grammar pane ───────────────────────────────────────────────── */
function GrammarItem({
  g, open, onToggle,
}) {
  return (
    <div
      className="hg-acc-item"
      data-open={open}
    >
      <button
        className="hg-acc-head"
        onClick={onToggle}
      >
        <div style={{
          flex: 1,
          textAlign: "left",
        }}
        >
          <div className="hg-acc-pat">{g.pat}</div>
          <div className="hg-acc-gloss">{g.gloss}</div>
        </div>
        <ChevronDown
          className="hg-acc-chev"
          size={20}
        />
      </button>
      {open && (
        <div className="hg-acc-body">
          <p className="hg-acc-note">{g.note}</p>
          <ul className="hg-exlist">
            {g.ex.map((e, i) => (
              <ExRow
                key={i}
                e={e}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ExRow({
  e,
}) {
  const [show, setShow] = useState(false);
  return (
    <li className="hg-ex">
      <button
        className="hg-ex-jp"
        onClick={() => speak(e.jp)}
      >
        <Volume2
          size={13}
          style={{
            opacity: 0.5,
            marginRight: 6,
            verticalAlign: "middle",
          }}
        />
        {e.jp}
      </button>
      <div
        className="hg-ex-en"
        data-show={show}
        onClick={() => setShow(s => !s)}
      >
        {show ? e.en : "Tap to reveal translation"}
      </div>
    </li>
  );
}

function Grammar() {
  const [openIdx, setOpenIdx] = useState(0);
  return (
    <div className="hg-pane">
      <p className="hg-hint">Five patterns that recur across the comments. Tap a Japanese line to hear it; tap the italic line to reveal the English.</p>
      <div className="hg-accordion">
        {GRAMMAR.map((g, i) => (
          <GrammarItem
            key={g.pat}
            g={g}
            open={openIdx === i}
            onToggle={() => setOpenIdx(openIdx === i ? -1 : i)}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Source (comments) pane ─────────────────────────────────────── */
function SourceCard({
  s, n,
}) {
  const [open, setOpen] = useState(false);
  const showFuri = useFurigana();
  return (
    <div className="hg-src-card">
      <div className="hg-src-num">コメント {n}</div>
      <button
        className="hg-src-jptext"
        onClick={() => speak(s.jp)}
      >
        <Volume2
          size={14}
          style={{
            opacity: 0.5,
            marginRight: 7,
            verticalAlign: "middle",
          }}
        />
        <span className="hg-src-jp">{s.jp}</span>
      </button>
      <button
        className="hg-src-reveal"
        data-open={open}
        onClick={() => setOpen(o => !o)}
      >
        {open ? s.en : "Reveal English translation ▸"}
      </button>
      {open && (
        <div className="hg-src-break">
          <div>
            <p className="hg-src-h">Grammar</p>
            {s.grammar.map((g, i) => (
              <div
                key={i}
                style={{
                  marginBottom: 9,
                }}
              >
                <div className="hg-src-gpat">{g.p}</div>
                <div className="hg-src-gdesc">{g.d}</div>
              </div>
            ))}
          </div>
          <div>
            <p className="hg-src-h">Vocabulary</p>
            {s.vocab.map((v, i) => (
              <div
                key={i}
                style={{
                  marginBottom: 8,
                }}
              >
                <span className="hg-src-vw">
                  {showFuri
                    ? (
                      <Furi
                        kanji={v.w}
                        yomi={v.y}
                      />
                    )
                    : v.w}
                </span>
                {" "}
                <LevelBadge lvl={v.lvl} />
                <div className="hg-src-vm">{v.m}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      <a
        className="hg-src-cite"
        href={s.url}
        target="_blank"
        rel="noreferrer"
      >
        <Youtube size={13} />
        {" "}
        {s.where}
      </a>
    </div>
  );
}

function SourceSentences() {
  return (
    <div className="hg-pane">
      <p className="hg-hint">
        15 real comments, used in full and verbatim. Tap the speaker to hear each one, reveal the
        translation, then open the breakdown. Every card links back to the
        {" "}
        <a
          href={VIDEO_URL}
          target="_blank"
          rel="noreferrer"
        >source video
        </a>
        .
      </p>
      <div className="hg-src-list">
        {SOURCE.map((s, i) => (
          <SourceCard
            key={i}
            s={s}
            n={i + 1}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Practice pane ──────────────────────────────────────────────── */
function Practice() {
  const [phase, setPhase] = useState("setup"); // setup | drill | result
  const [dir, setDir] = useState("jp2en"); // jp2en | en2jp
  const [count, setCount] = useState(12);
  const [deck, setDeck] = useState([]);
  const [idx, setIdx] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [score, setScore] = useState({
    good: 0,
    review: 0,
  });
  const showFuri = useFurigana();

  const start = () => {
    const shuffled = [...VOCAB].sort(() => Math.random() - 0.5).slice(0, count);
    setDeck(shuffled); setIdx(0); setShowBack(false);
    setScore({
      good: 0,
      review: 0,
    }); setPhase("drill");
  };

  const grade = (ok) => {
    setScore(s => ({
      good: s.good + (ok ? 1 : 0),
      review: s.review + (ok ? 0 : 1),
    }));
    if (idx + 1 >= deck.length) setPhase("result");
    else { setIdx(idx + 1); setShowBack(false); }
  };

  if (phase === "setup") {
    return (
      <div className="hg-pane">
        <div className="hg-practice-setup">
          <div className="hg-setup-card">
            <Ghost
              size={30}
              style={{
                color: "var(--citrus)",
              }}
            />
            <h3 style={{
              fontFamily: "var(--en-serif)",
              margin: "12px 0 4px",
              fontSize: 22,
            }}
            >Flashcard drill
            </h3>
            <p style={{
              color: "var(--stone)",
              fontSize: 13.5,
              margin: "0 0 20px",
            }}
            >
              Self-graded practice on the {VOCAB.length} lesson words.
            </p>
            <div style={{
              marginBottom: 18,
            }}
            >
              <div className="hg-setup-label">Direction</div>
              <div className="hg-seg">
                <button
                  data-active={dir === "jp2en"}
                  onClick={() => setDir("jp2en")}
                >JP → EN
                </button>
                <button
                  data-active={dir === "en2jp"}
                  onClick={() => setDir("en2jp")}
                >EN → JP
                </button>
              </div>
            </div>
            <div style={{
              marginBottom: 24,
            }}
            >
              <div className="hg-setup-label">How many</div>
              <div className="hg-seg">
                {[8, 12, 20, VOCAB.length].map(n => (
                  <button
                    key={n}
                    data-active={count === n}
                    onClick={() => setCount(n)}
                  >{n}
                  </button>
                ))}
              </div>
            </div>
            <button
              className="hg-primary"
              onClick={start}
            >
              <Play size={16} />
              {" "}
              Start
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "drill") {
    const v = deck[idx];
    const front = dir === "jp2en"
      ? (showFuri
        ? (
          <Furi
            kanji={v.jp}
            yomi={v.yomi}
          />
        )
        : v.jp)
      : v.en;
    const back = dir === "jp2en"
      ? (
        <>
          <div className="hg-quiz-yomi">{v.yomi}</div>
          <div className="hg-quiz-en">{v.en}</div>
        </>
      )
      : (
        <div className="hg-quiz-jp">{showFuri
          ? (
            <Furi
              kanji={v.jp}
              yomi={v.yomi}
            />
          )
          : v.jp}
        </div>
      );
    return (
      <div className="hg-pane">
        <div className="hg-progress">
          <div
            className="hg-progress-bar"
            style={{
              width: `${(idx / deck.length) * 100}%`,
            }}
          />
        </div>
        <div style={{
          textAlign: "center",
          fontSize: 12,
          color: "var(--stone)",
          margin: "0 0 12px",
        }}
        >
          {idx + 1} / {deck.length}
        </div>
        <div
          className="hg-quizcard"
          onClick={() => { setShowBack(true); speak(v.jp); }}
        >
          <div className="hg-quiz-jp">{front}</div>
          {showBack
            ? (
              <div style={{
                marginTop: 14,
              }}
              >{back}
              </div>
            )
            : <div className="hg-quiz-tap">Tap to reveal</div>}
        </div>
        {showBack
          ? (
            <div className="hg-grade">
              <button
                className="hg-grade-btn review"
                onClick={() => grade(false)}
              >
                <RotateCcw size={16} />
                {" "}
                Review
              </button>
              <button
                className="hg-grade-btn good"
                onClick={() => grade(true)}
              >
                <Check size={16} />
                {" "}
                Got it
              </button>
            </div>
          )
          : (
            <div style={{
              textAlign: "center",
              marginTop: 14,
              color: "var(--stone)",
              fontSize: 13,
            }}
            >
              <button
                className="hg-reveal-btn"
                onClick={() => { setShowBack(true); speak(v.jp); }}
              >Reveal answer
              </button>
            </div>
          )}
      </div>
    );
  }

  // result
  const pct = Math.round((score.good / deck.length) * 100);
  return (
    <div className="hg-pane">
      <div className="hg-practice-setup">
        <div className="hg-setup-card">
          <div
            className="hg-result-ring"
            style={{
              "--pct": pct,
            }}
          >
            <span>{pct}%</span>
          </div>
          <h3 style={{
            fontFamily: "var(--en-serif)",
            margin: "4px 0 6px",
            fontSize: 22,
          }}
          >
            {pct >= 80 ? "ゴーストが喜んでる" : pct >= 50 ? "いい調子！" : "もう一回！"}
          </h3>
          <p style={{
            color: "var(--stone)",
            fontSize: 14,
            margin: "0 0 20px",
          }}
          >
            {score.good} solid · {score.review} to review
          </p>
          <button
            className="hg-primary"
            onClick={() => setPhase("setup")}
          >
            <RefreshCw size={16} />
            {" "}
            Again
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── App shell ──────────────────────────────────────────────────── */
export default function App() {
  const [tab, setTab] = useState("culture");
  const [furi, setFuri] = useState(true);

  const Pane = useMemo(() => ({
    culture: Culture,
    vocab: Vocab,
    grammar: Grammar,
    source: SourceSentences,
    practice: Practice,
  }[tab]), [tab]);

  return (
    <FuriganaCtx.Provider value={furi}>
      <style>{CSS}</style>
      <div className="hg-root">
        <header className="hg-header">
          <div className="hg-header-inner">
            <div className="hg-scroll">攻殻機動隊</div>
            <div className="hg-title-block">
              <div className="hg-eyebrow">YouTube Comments · Japanese Study</div>
              <h1 className="hg-title">
                ゴースト
                <span className="hg-dot" />
                の囁き
              </h1>
              <p className="hg-sub">
                15 real comments on King Gnu’s “GO GHOST” opening for 『攻殻機動隊 THE GHOST IN THE SHELL』
              </p>
            </div>
            <button
              className="hg-furi-toggle"
              aria-pressed={furi}
              onClick={() => setFuri(f => !f)}
            >
              <Type size={16} />
              <span className="hg-furi-kanji">{furi ? "ふり" : "漢"}</span>
              <span className="hg-furi-label">{furi ? "furigana on" : "furigana off"}</span>
            </button>
          </div>
          <nav className="hg-tabs">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  className="hg-tab"
                  data-active={tab === t.id}
                  onClick={() => setTab(t.id)}
                >
                  <Icon size={15} />
                  <span className="hg-tab-jp">{t.jp}</span>
                  <span className="hg-tab-en">{t.en}</span>
                </button>
              );
            })}
          </nav>
        </header>
        <main className="hg-main">
          <Pane />
        </main>
        <footer className="hg-footer">
          Built from real public comments on
          {" "}
          <a
            href={VIDEO_URL}
            target="_blank"
            rel="noreferrer"
          >youtube.com/watch?v=FhzaLI_Npg8
          </a>
          .
          Comment text © their authors; translations & notes are study aids. Ghost in the Shell © Shirow Masamune / Kodansha.
        </footer>
      </div>
    </FuriganaCtx.Provider>
  );
}

/* ────────────────────────────────────────────────────────────────
   CSS — Ghost in the Shell palette:
   deep teal-navy (the net at night) + GITS title-orange + signal grey
   ──────────────────────────────────────────────────────────────── */
const CSS = `
:root{
  --indigo:#0C2530; --indigo2:#16414E; --indigo-ink:#06171D;
  --plaster:#E3E9EB; --plaster2:#D3DCDF; --card:#F1F5F6;
  --citrus:#E8722D; --citrus-deep:#C4551A; --citrus-soft:#F4C892;
  --cyan:#2CB7C7; --cyan-deep:#178595;
  --sumi:#182227; --stone:#5E7078; --glaze:#D6DEE0;
  --line:rgba(24,34,39,.13); --line2:rgba(24,34,39,.07);
  --jp-serif:"Hiragino Mincho ProN","Yu Mincho","YuMincho","Noto Serif JP",serif;
  --jp-sans:"Hiragino Kaku Gothic ProN","Yu Gothic","Meiryo","Noto Sans JP",sans-serif;
  --en-serif:"Iowan Old Style","Palatino Linotype","Georgia",serif;
  --en-sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
}
*{box-sizing:border-box;}
.hg-root{background:var(--plaster);color:var(--sumi);font-family:var(--en-sans);min-height:100vh;line-height:1.5;-webkit-font-smoothing:antialiased;}
a{color:var(--citrus-deep);}
button{font-family:inherit;cursor:pointer;}

.hg-rt{font-family:var(--jp-sans);font-size:.52em;font-weight:400;color:var(--stone);letter-spacing:.04em;user-select:none;}
.hg-rt.pop{color:var(--citrus-soft);font-size:.58em;}

/* header */
.hg-header{background:var(--indigo);color:var(--plaster);position:relative;overflow:hidden;}
.hg-header::after{content:"";position:absolute;right:-70px;top:-80px;width:240px;height:240px;border-radius:50%;background:radial-gradient(circle at 35% 35%,var(--cyan),var(--cyan-deep));opacity:.55;filter:blur(2px);}
.hg-header::before{content:"";position:absolute;left:-40px;bottom:-90px;width:180px;height:180px;border-radius:50%;background:radial-gradient(circle at 40% 40%,var(--citrus),var(--citrus-deep));opacity:.35;}
.hg-header-inner{max-width:1080px;margin:0 auto;padding:28px 24px 20px;position:relative;z-index:2;display:flex;align-items:flex-start;gap:20px;}
.hg-scroll{writing-mode:vertical-rl;font-family:var(--jp-serif);font-size:15px;letter-spacing:.28em;color:var(--citrus-soft);border-right:1px solid rgba(244,200,146,.3);padding-right:12px;min-height:110px;flex:none;}
.hg-title-block{flex:1;min-width:0;}
.hg-eyebrow{font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--cyan);font-weight:600;}
.hg-title{font-family:var(--jp-serif);font-size:48px;line-height:1.05;margin:4px 0 0;font-weight:600;color:#fff;}
.hg-dot{display:inline-block;width:12px;height:12px;border-radius:50%;background:var(--citrus);margin:0 2px;}
.hg-sub{margin-top:10px;font-size:13px;color:rgba(227,233,235,.75);max-width:52ch;}

.hg-furi-toggle{flex:none;align-self:flex-start;display:flex;flex-direction:column;align-items:center;gap:4px;padding:9px 13px;background:rgba(255,255,255,.08);border:1px solid rgba(244,200,146,.22);border-radius:10px;color:var(--plaster);transition:.18s;position:relative;z-index:2;}
.hg-furi-toggle:hover{background:rgba(255,255,255,.14);border-color:var(--citrus-soft);}
.hg-furi-toggle[aria-pressed="true"]{border-color:var(--citrus);background:rgba(232,114,45,.2);}
.hg-furi-kanji{font-family:var(--jp-serif);font-size:22px;line-height:1.25;}
.hg-furi-label{font-family:var(--jp-sans);font-size:9px;letter-spacing:.05em;color:rgba(227,233,235,.6);white-space:nowrap;}

/* tabs */
.hg-tabs{max-width:1080px;margin:0 auto;padding:0 16px;display:flex;gap:2px;overflow-x:auto;position:relative;z-index:2;}
.hg-tab{background:transparent;border:none;color:rgba(227,233,235,.6);padding:11px 15px 13px;display:flex;align-items:center;gap:7px;border-bottom:2.5px solid transparent;white-space:nowrap;transition:color .18s;font-size:13px;}
.hg-tab-jp{font-family:var(--jp-sans);font-weight:700;}
.hg-tab-en{opacity:.75;font-size:12px;}
.hg-tab[data-active="true"]{color:#fff;border-color:var(--citrus);}

/* main */
.hg-main{max-width:1080px;margin:0 auto;padding:26px 24px 10px;}
.hg-pane{animation:fade .32s ease;}
@keyframes fade{from{opacity:0;transform:translateY(5px);}to{opacity:1;transform:none;}}
.hg-lede{font-family:var(--en-serif);font-size:17px;line-height:1.6;max-width:64ch;margin:0 0 24px;}
.hg-hint{font-size:13px;color:var(--stone);margin:0 0 16px;max-width:70ch;}

/* culture */
.hg-culture-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:16px;}
.hg-culture-card{background:var(--card);border:1px solid var(--line);border-left:3px solid var(--citrus);border-radius:4px;padding:18px 20px;}
.hg-culture-head{display:flex;gap:12px;align-items:center;margin-bottom:11px;}
.hg-culture-icon{width:36px;height:36px;border-radius:50%;background:var(--indigo);color:var(--cyan);display:grid;place-items:center;flex:none;}
.hg-culture-jp{font-family:var(--jp-serif);font-size:19px;margin:0;font-weight:600;}
.hg-culture-en{font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--stone);}
.hg-culture-body{font-size:14px;line-height:1.62;margin:0 0 13px;}
.hg-chips{display:flex;flex-wrap:wrap;gap:7px;}

/* vocab pill + popover */
.hg-pill-wrap{position:relative;display:inline-block;}
.hg-chip{font-family:var(--jp-sans);font-size:13px;background:var(--plaster2);border:1px solid var(--line);border-radius:999px;padding:3px 12px 4px;line-height:1.9;color:var(--sumi);transition:.15s;cursor:pointer;}
.hg-chip:hover,.hg-chip:focus-visible{background:var(--citrus);border-color:var(--citrus);color:#fff;outline:none;}
.hg-chip:hover .hg-rt,.hg-chip:focus-visible .hg-rt{color:rgba(255,255,255,.8);}
.hg-popover{position:absolute;left:50%;transform:translateX(-50%);background:var(--indigo-ink);color:var(--plaster);border-radius:8px;padding:10px 13px 9px;min-width:150px;max-width:230px;width:max-content;box-shadow:0 8px 24px rgba(6,23,29,.5),0 2px 6px rgba(0,0,0,.25);z-index:999;display:flex;flex-direction:column;gap:3px;animation:popIn .14s ease;}
@keyframes popIn{from{opacity:0;transform:translateX(-50%) scale(.93);}to{opacity:1;transform:translateX(-50%) scale(1);}}
.hg-popover[data-pos="above"]{bottom:calc(100% + 9px);}
.hg-popover[data-pos="below"]{top:calc(100% + 9px);}
.hg-popover[data-pos="above"]::after{content:"";position:absolute;bottom:-5px;left:50%;transform:translateX(-50%);border:5px solid transparent;border-top-color:var(--indigo-ink);border-bottom:none;}
.hg-popover[data-pos="below"]::after{content:"";position:absolute;top:-5px;left:50%;transform:translateX(-50%);border:5px solid transparent;border-bottom-color:var(--indigo-ink);border-top:none;}
.hg-pop-jp{font-family:var(--jp-serif);font-size:20px;font-weight:600;}
.hg-pop-yomi{font-family:var(--jp-sans);font-size:11.5px;color:rgba(227,233,235,.55);}
.hg-pop-en{font-size:12.5px;color:rgba(227,233,235,.9);line-height:1.4;}
.hg-popover .hg-badge{align-self:flex-start;margin-top:3px;background:rgba(255,255,255,.1);color:var(--citrus-soft);}
.hg-popover .hg-badge[data-jlpt="yes"]{background:var(--citrus);color:#fff;}

/* badges */
.hg-badge{font-size:9.5px;font-weight:700;padding:2px 6px;border-radius:4px;background:var(--plaster2);color:var(--stone);text-transform:uppercase;letter-spacing:.03em;}
.hg-badge[data-jlpt="yes"]{background:var(--citrus);color:#fff;}

/* vocab filter + cards */
.hg-filter{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:6px;}
.hg-filter-btn{display:flex;align-items:center;gap:6px;background:var(--card);border:1px solid var(--line);border-radius:999px;padding:6px 13px;font-size:12.5px;color:var(--stone);transition:.15s;}
.hg-filter-btn[data-active="true"]{background:var(--indigo);border-color:var(--indigo);color:#fff;}
.hg-cardgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(158px,1fr));gap:12px;margin-top:14px;}
.hg-flip{height:168px;perspective:1000px;outline:none;}
.hg-flip-inner{position:relative;width:100%;height:100%;transition:transform .5s;transform-style:preserve-3d;}
.hg-flip[data-flipped="true"] .hg-flip-inner{transform:rotateY(180deg);}
.hg-face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:6px;border:1px solid var(--line);padding:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:6px;}
.hg-front{background:var(--card);}
.hg-back{background:var(--indigo);color:var(--plaster);transform:rotateY(180deg);}
.hg-vocab-jp{font-family:var(--jp-serif);font-size:24px;font-weight:600;line-height:1.5;}
.hg-back-yomi{font-family:var(--jp-sans);font-size:13px;color:var(--cyan);}
.hg-back-en{font-size:12.5px;line-height:1.4;color:rgba(227,233,235,.92);}
.hg-face .hg-badge{position:absolute;bottom:8px;right:9px;}
.hg-face .hg-badge[data-jlpt="yes"]{background:var(--citrus);color:#fff;}
.hg-back .hg-badge{background:rgba(244,200,146,.15);color:var(--citrus-soft);}
.hg-back .hg-badge[data-jlpt="yes"]{background:var(--citrus);color:#fff;}

/* grammar */
.hg-accordion{display:flex;flex-direction:column;gap:10px;}
.hg-acc-item{background:var(--card);border:1px solid var(--line);border-radius:5px;overflow:hidden;}
.hg-acc-item[data-open="true"]{border-color:var(--citrus);}
.hg-acc-head{width:100%;background:transparent;border:none;display:flex;align-items:center;gap:14px;padding:15px 17px;}
.hg-acc-pat{font-family:var(--jp-serif);font-size:19px;font-weight:600;}
.hg-acc-gloss{font-size:12px;color:var(--stone);margin-top:2px;}
.hg-acc-chev{color:var(--stone);transition:transform .25s;flex:none;}
.hg-acc-item[data-open="true"] .hg-acc-chev{transform:rotate(180deg);color:var(--citrus);}
.hg-acc-body{padding:2px 17px 18px 20px;}
.hg-acc-note{font-size:13.5px;line-height:1.62;margin:0 0 14px;max-width:66ch;}
.hg-exlist{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:11px;}
.hg-ex{border-left:2px solid var(--glaze);padding-left:13px;}
.hg-ex-jp{background:none;border:none;font-family:var(--jp-serif);font-size:17px;line-height:1.5;text-align:left;padding:0;color:var(--sumi);}
.hg-ex-en{font-size:13px;color:var(--stone);margin-top:4px;font-style:italic;cursor:pointer;}
.hg-ex-en[data-show="true"]{color:var(--sumi);font-style:normal;}

/* source / comments */
.hg-src-list{display:flex;flex-direction:column;gap:15px;}
.hg-src-card{background:var(--card);border:1px solid var(--line);border-radius:6px;border-top:3px solid var(--indigo);padding:15px 19px 16px;position:relative;}
.hg-src-num{font-family:var(--jp-sans);font-size:10.5px;letter-spacing:.12em;color:var(--cyan-deep);font-weight:700;margin-bottom:9px;}
.hg-src-jptext{display:block;width:100%;text-align:left;background:none;border:none;padding:0;}
.hg-src-jp{font-family:var(--jp-serif);font-size:20px;line-height:1.65;font-weight:500;color:var(--sumi);}
.hg-src-reveal{display:block;width:100%;text-align:left;margin-top:13px;background:var(--plaster2);border:1px dashed var(--line);border-radius:5px;padding:10px 13px;font-family:var(--en-serif);font-size:15px;color:var(--stone);font-style:italic;}
.hg-src-reveal[data-open="true"]{background:transparent;border-style:solid;border-color:var(--citrus-soft);color:var(--sumi);font-style:normal;line-height:1.55;}
.hg-src-break{margin-top:13px;padding-top:14px;border-top:1px solid var(--line2);display:grid;grid-template-columns:1fr 1fr;gap:22px;}
.hg-src-h{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--citrus-deep);margin:0 0 9px;font-weight:700;}
.hg-src-gpat{font-family:var(--jp-sans);font-size:13.5px;font-weight:700;}
.hg-src-gdesc{font-size:12.5px;line-height:1.55;color:var(--sumi);}
.hg-src-vw{font-family:var(--jp-serif);font-size:16px;font-weight:600;}
.hg-src-vm{font-size:12.5px;color:var(--stone);margin-top:1px;}
.hg-src-cite{display:inline-flex;align-items:center;gap:6px;margin-top:14px;font-size:11.5px;color:var(--stone);text-decoration:none;}
.hg-src-cite:hover{color:var(--citrus-deep);}

/* practice */
.hg-practice-setup{display:flex;justify-content:center;padding-top:8px;}
.hg-setup-card{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:28px 28px 32px;max-width:440px;width:100%;text-align:center;}
.hg-setup-label{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--stone);margin-bottom:9px;}
.hg-seg{display:inline-flex;background:var(--plaster2);border-radius:999px;padding:3px;gap:3px;}
.hg-seg button{border:none;background:transparent;padding:7px 15px;border-radius:999px;font-size:13px;color:var(--sumi);}
.hg-seg button[data-active="true"]{background:var(--indigo);color:#fff;}
.hg-primary{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:var(--citrus);color:#fff;border:none;border-radius:999px;padding:12px 26px;font-size:15px;font-weight:600;box-shadow:0 5px 16px rgba(232,114,45,.28);}
.hg-progress{height:4px;background:var(--plaster2);border-radius:999px;overflow:hidden;margin-bottom:8px;}
.hg-progress-bar{height:100%;background:var(--citrus);transition:width .3s;}
.hg-quizcard{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:44px 24px;text-align:center;min-height:220px;display:flex;flex-direction:column;align-items:center;justify-content:center;}
.hg-quiz-jp{font-family:var(--jp-serif);font-size:34px;font-weight:600;line-height:1.6;}
.hg-quiz-yomi{font-family:var(--jp-sans);font-size:16px;color:var(--cyan-deep);}
.hg-quiz-en{font-size:18px;color:var(--sumi);margin-top:4px;}
.hg-quiz-tap{font-size:13px;color:var(--stone);margin-top:16px;}
.hg-reveal-btn{background:transparent;border:1px solid var(--line);border-radius:999px;padding:8px 18px;color:var(--stone);font-size:13px;}
.hg-grade{display:flex;gap:11px;margin-top:14px;}
.hg-grade-btn{flex:1;display:flex;align-items:center;justify-content:center;gap:7px;padding:13px;border-radius:8px;font-size:14px;font-weight:600;border:1.5px solid;}
.hg-grade-btn.review{background:transparent;border-color:var(--stone);color:var(--sumi);}
.hg-grade-btn.good{background:var(--indigo);border-color:var(--indigo);color:#fff;}
.hg-result-ring{width:116px;height:116px;border-radius:50%;margin:0 auto 16px;display:grid;place-items:center;background:conic-gradient(var(--citrus) calc(var(--pct)*1%),var(--plaster2) 0);}
.hg-result-ring span{width:88px;height:88px;border-radius:50%;background:var(--card);display:grid;place-items:center;font-family:var(--en-serif);font-size:25px;font-weight:600;}

/* footer */
.hg-footer{max-width:1080px;margin:26px auto 0;padding:20px 24px 34px;font-size:11.5px;color:var(--stone);line-height:1.6;border-top:1px solid var(--line2);}

@media (max-width:560px){
  .hg-scroll{display:none;}
  .hg-title{font-size:36px;}
  .hg-header-inner{padding:20px 16px 16px;flex-wrap:wrap;}
  .hg-main{padding:20px 14px 8px;}
  .hg-tab-en{display:none;}
  .hg-src-break{grid-template-columns:1fr;gap:16px;}
}
@media (prefers-reduced-motion:reduce){*{transition:none !important;animation:none !important;}}
`;

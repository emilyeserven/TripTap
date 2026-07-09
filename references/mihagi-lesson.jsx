import React, { createContext, useContext, useMemo, useState, useRef, useEffect } from "react";

import {
  Sparkles, Home, Utensils, Waves, Sun, Landmark, BookOpen,
  GraduationCap, ScrollText, RefreshCw, ChevronDown, Volume2,
  Check, RotateCcw, Eye, MapPin,
} from "lucide-react";

/* ============================================================
   SOURCE: Resort Hotel Mihagi  (リゾートホテル美萩)
   https://resorthotel-mihagi.com/
   A seaside "photo-memory" resort on Kikugahama Beach, Hagi,
   Yamaguchi — a Sea-of-Japan sunset (夕陽百選) location.
   ============================================================ */

/* ---------- VOCAB ---------- */
const VOCAB = [
  // scenery / 景観
  {
    jp: "絶景",
    yomi: "ぜっけい",
    en: "magnificent view",
    lvl: "N2",
    cat: "scenery",
  },
  {
    jp: "夕陽",
    yomi: "ゆうひ",
    en: "the setting sun",
    lvl: "N3",
    cat: "scenery",
  },
  {
    jp: "夕景",
    yomi: "ゆうけい",
    en: "evening scenery",
    lvl: "N1",
    cat: "scenery",
  },
  {
    jp: "夕暮れ",
    yomi: "ゆうぐれ",
    en: "dusk, twilight",
    lvl: "N2",
    cat: "scenery",
  },
  {
    jp: "菊ヶ浜",
    yomi: "きくがはま",
    en: "Kikugahama (beach name)",
    lvl: "local",
    cat: "scenery",
  },
  {
    jp: "白砂浜",
    yomi: "はくさはま",
    en: "white-sand beach",
    lvl: "N1",
    cat: "scenery",
  },
  {
    jp: "海岸",
    yomi: "かいがん",
    en: "coast, shore",
    lvl: "N3",
    cat: "scenery",
  },
  {
    jp: "日本海",
    yomi: "にほんかい",
    en: "the Sea of Japan",
    lvl: "N4",
    cat: "scenery",
  },
  {
    jp: "幻想的",
    yomi: "げんそうてき",
    en: "dreamlike, fantastical",
    lvl: "N1",
    cat: "scenery",
  },
  {
    jp: "景観",
    yomi: "けいかん",
    en: "scenery, landscape",
    lvl: "N1",
    cat: "scenery",
  },
  {
    jp: "散策",
    yomi: "さんさく",
    en: "a stroll, a ramble",
    lvl: "N1",
    cat: "scenery",
  },
  {
    jp: "城下町",
    yomi: "じょうかまち",
    en: "castle town",
    lvl: "N2",
    cat: "scenery",
  },

  // rooms / 客室
  {
    jp: "客室",
    yomi: "きゃくしつ",
    en: "guest room",
    lvl: "N2",
    cat: "lodging",
  },
  {
    jp: "宿",
    yomi: "やど",
    en: "inn, lodging",
    lvl: "N3",
    cat: "lodging",
  },
  {
    jp: "滞在",
    yomi: "たいざい",
    en: "a stay (at a place)",
    lvl: "N2",
    cat: "lodging",
  },
  {
    jp: "海側",
    yomi: "うみがわ",
    en: "the ocean-facing side",
    lvl: "N4",
    cat: "lodging",
  },
  {
    jp: "一望",
    yomi: "いちぼう",
    en: "a sweeping/panoramic view",
    lvl: "N1",
    cat: "lodging",
  },
  {
    jp: "寛ぎ",
    yomi: "くつろぎ",
    en: "relaxation, ease",
    lvl: "N2",
    cat: "lodging",
  },
  {
    jp: "貸切",
    yomi: "かしきり",
    en: "private / reserved use",
    lvl: "N1",
    cat: "lodging",
  },

  // onsen / 温泉
  {
    jp: "温泉",
    yomi: "おんせん",
    en: "hot spring",
    lvl: "N4",
    cat: "onsen",
  },
  {
    jp: "露天風呂",
    yomi: "ろてんぶろ",
    en: "open-air bath",
    lvl: "N2",
    cat: "onsen",
  },
  {
    jp: "天然",
    yomi: "てんねん",
    en: "natural",
    lvl: "N2",
    cat: "onsen",
  },
  {
    jp: "源泉",
    yomi: "げんせん",
    en: "hot-spring source",
    lvl: "N1",
    cat: "onsen",
  },
  {
    jp: "入浴",
    yomi: "にゅうよく",
    en: "bathing",
    lvl: "N2",
    cat: "onsen",
  },
  {
    jp: "癒し",
    yomi: "いやし",
    en: "healing, comfort",
    lvl: "N2",
    cat: "onsen",
  },
  {
    jp: "足湯",
    yomi: "あしゆ",
    en: "foot bath",
    lvl: "N1",
    cat: "onsen",
  },

  // dining / 料理
  {
    jp: "料理",
    yomi: "りょうり",
    en: "cuisine, cooking",
    lvl: "N5",
    cat: "dining",
  },
  {
    jp: "懐石料理",
    yomi: "かいせきりょうり",
    en: "kaiseki course cuisine",
    lvl: "N1",
    cat: "dining",
  },
  {
    jp: "和食",
    yomi: "わしょく",
    en: "Japanese cuisine",
    lvl: "N4",
    cat: "dining",
  },
  {
    jp: "旬",
    yomi: "しゅん",
    en: "the season for (a food)",
    lvl: "N2",
    cat: "dining",
  },
  {
    jp: "食材",
    yomi: "しょくざい",
    en: "food ingredients",
    lvl: "N2",
    cat: "dining",
  },
  {
    jp: "地元",
    yomi: "じもと",
    en: "local (area)",
    lvl: "N3",
    cat: "dining",
  },
  {
    jp: "堪能",
    yomi: "たんのう",
    en: "to savor / fully enjoy",
    lvl: "N1",
    cat: "dining",
  },
];
const VOCAB_MAP = Object.fromEntries(VOCAB.map(v => [v.jp, v]));

/* ---------- CATS ---------- */
const CATS = {
  all: {
    jp: "すべて",
    en: "All",
    icon: Sparkles,
  },
  lodging: {
    jp: "客室",
    en: "Rooms",
    icon: Home,
  },
  onsen: {
    jp: "温泉",
    en: "Onsen",
    icon: Waves,
  },
  dining: {
    jp: "料理",
    en: "Dining",
    icon: Utensils,
  },
  scenery: {
    jp: "景観",
    en: "Scenery",
    icon: Sun,
  },
};

/* ---------- TABS ---------- */
const TABS = [
  {
    id: "culture",
    jp: "文化",
    en: "Culture",
    icon: Landmark,
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
    en: "From the inn",
    icon: ScrollText,
  },
  {
    id: "practice",
    jp: "練習",
    en: "Practice",
    icon: RefreshCw,
  },
];

/* ---------- GRAMMAR ---------- */
const GRAMMAR = [
  {
    pat: "〜てみてください",
    gloss: "try doing ~ (and see)",
    note: "Take a verb in て-form, add みる ('to see / try') and the polite ください. It softly invites someone to give something a go, without pressure — perfect for hotel copy nudging you to 'go on, try it.' On the site: 出かけてみてください, 'why not head out (and see).'",
    ex: [
      {
        jp: "チェックイン後に、菊ヶ浜を散策してみてください。",
        en: "After checking in, try taking a stroll along Kikugahama.",
      },
      {
        jp: "露天風呂に入ってみてください。",
        en: "Do try getting into the open-air bath.",
      },
      {
        jp: "地元の和食を食べてみてください。",
        en: "Try eating the local Japanese cuisine.",
      },
    ],
  },
  {
    pat: "〜ことができます",
    gloss: "to be able to ~",
    note: "Plain-form verb + ことができます is the 'textbook' way to say 'can / be able to.' It is a touch more formal than the potential verb form (泳げます), which is why guest-facing writing likes it. On the site: 泳ぎに行くことができます, 'you can go swimming.'",
    ex: [
      {
        jp: "海水浴シーズンには海に泳ぎに行くことができます。",
        en: "During the swimming season, you can go swimming in the sea.",
      },
      {
        jp: "貸切で温泉を満喫することができます。",
        en: "You can fully enjoy the hot spring privately.",
      },
      {
        jp: "客室から日本海を一望することができます。",
        en: "You can take in a panoramic view of the Sea of Japan from your room.",
      },
    ],
  },
  {
    pat: "お／ご〜いただけます・ください",
    gloss: "honorific 'you may ~' / 'please ~'",
    note: "Hospitality keigo. お + verb-stem (or ご + noun) + いただけます humbly says 'we can have you ~' → 'you may ~'; the ください version is a polite request. On the site: お選びいただけます ('you may choose') and ご堪能ください ('please savor'). ELI5: it's the extra-polite gift-wrap around an ordinary verb.",
    ex: [
      {
        jp: "多様なお部屋タイプからお選びいただけます。",
        en: "You may choose from a wide variety of room types.",
      },
      {
        jp: "旬のお料理をご堪能ください。",
        en: "Please savor the seasonal cuisine.",
      },
      {
        jp: "夕景をゆっくりお楽しみいただけます。",
        en: "You may leisurely enjoy the evening view.",
      },
    ],
  },
  {
    pat: "〜ながら",
    gloss: "while doing ~ (at the same time)",
    note: "Attach ながら to a verb-stem to run two actions in parallel; the ながら clause is the backdrop, the main clause is the point. On the site: 夕景を眺めながらの入浴 — 'bathing while gazing at the evening view.' Note how ながら + の turns the whole phrase into a noun modifier.",
    ex: [
      {
        jp: "夕景を眺めながら入浴します。",
        en: "I bathe while gazing at the evening scenery.",
      },
      {
        jp: "波の音を聞きながら散策しました。",
        en: "I strolled while listening to the sound of the waves.",
      },
      {
        jp: "海を見ながら朝食をいただきました。",
        en: "I had breakfast while looking at the sea.",
      },
    ],
  },
  {
    pat: "〜にこだわる",
    gloss: "to be particular about / insist on ~",
    note: "Noun + にこだわる signals a proud, uncompromising focus on something — a chef's fixation on quality, a maker's insistence on a detail. Very common in food and craft marketing. On the site: 旬の食材にこだわった和食 — 'Japanese food particular about seasonal ingredients.' The past こだわった here modifies 和食 as a relative clause.",
    ex: [
      {
        jp: "地元の食材にこだわっています。",
        en: "We are particular about local ingredients.",
      },
      {
        jp: "旬にこだわった料理をご用意します。",
        en: "We prepare cuisine that insists on what's in season.",
      },
      {
        jp: "料理長は素材の鮮度にこだわります。",
        en: "The head chef is particular about the freshness of the ingredients.",
      },
    ],
  },
];

/* ---------- SOURCE (10 authentic sentences) ---------- */
const SOURCE = [
  {
    jp: "大切な方との思い出の1枚になる。",
    en: "It becomes one treasured photo shared with someone dear.",
    where: "Home — Appeal",
    url: "https://resorthotel-mihagi.com/",
    grammar: [
      {
        p: "〜との",
        d: "Noun + と + の links 'with (someone)' into the following noun: 大切な方との思い出 = 'memories with a dear person.'",
      },
      {
        p: "〜になる",
        d: "Noun + になる = 'becomes ~.' Here the whole stay 'becomes' a single photo.",
      },
    ],
    vocab: [
      {
        w: "大切",
        y: "たいせつ",
        m: "precious, dear (na-adj)",
        lvl: "N4",
      },
      {
        w: "思い出",
        y: "おもいで",
        m: "a memory, remembrance",
        lvl: "N3",
      },
      {
        w: "1枚",
        y: "いちまい",
        m: "one (flat thing) — here, one photo",
        lvl: "N5",
      },
    ],
  },
  {
    jp: "約1km続く白砂浜の菊ヶ浜がホテルの目の前に広がります。",
    en: "Kikugahama, a white-sand beach stretching about 1 km, spreads out right in front of the hotel.",
    where: "Appeal — Location",
    url: "https://resorthotel-mihagi.com/appeal/",
    grammar: [
      {
        p: "続く（名詞修飾）",
        d: "The plain verb 続く ('continues') directly modifies the noun after it — a relative clause: 約1km続く白砂浜 = 'a white-sand beach that continues about 1 km.'",
      },
      {
        p: "〜の目の前に",
        d: "Noun + の目の前に = 'right in front of ~.' Very handy for describing location.",
      },
    ],
    vocab: [
      {
        w: "約",
        y: "やく",
        m: "approximately, about",
        lvl: "N3",
      },
      {
        w: "白砂浜",
        y: "はくさはま",
        m: "white-sand beach",
        lvl: "N1",
      },
      {
        w: "広がる",
        y: "ひろがる",
        m: "to spread out, extend",
        lvl: "N2",
      },
    ],
  },
  {
    jp: "夕暮れには昼間とは違った幻想的な雰囲気があなたを包み込みます。",
    en: "At dusk, a dreamlike atmosphere unlike the daytime envelops you.",
    where: "Appeal — Location",
    url: "https://resorthotel-mihagi.com/appeal/",
    grammar: [
      {
        p: "〜とは違った",
        d: "Noun + とは違った = 'different from ~ / unlike ~.' Here 昼間とは違った modifies 雰囲気: 'an atmosphere unlike the daytime.'",
      },
      {
        p: "〜には（時）",
        d: "Time word + には marks 'at / on (that time)' with a bit of contrast emphasis: 夕暮れには = 'at dusk (as opposed to other times).'",
      },
    ],
    vocab: [
      {
        w: "昼間",
        y: "ひるま",
        m: "daytime",
        lvl: "N3",
      },
      {
        w: "幻想的",
        y: "げんそうてき",
        m: "dreamlike, fantastical (na-adj)",
        lvl: "N1",
      },
      {
        w: "包み込む",
        y: "つつみこむ",
        m: "to wrap up, envelop",
        lvl: "N1",
      },
    ],
  },
  {
    jp: "チェックイン後にお荷物を置いて、出かけてみてください。",
    en: "After checking in, set down your luggage and try heading out.",
    where: "Appeal — Beach",
    url: "https://resorthotel-mihagi.com/appeal/",
    grammar: [
      {
        p: "〜後に",
        d: "Noun + 後（ご）に = 'after ~.' チェックイン後に = 'after check-in.'",
      },
      {
        p: "〜てみてください",
        d: "て-form + みてください = 'try doing ~ (and see).' A gentle invitation. Recurs in the Grammar tab.",
      },
    ],
    vocab: [
      {
        w: "荷物",
        y: "にもつ",
        m: "luggage, baggage",
        lvl: "N4",
      },
      {
        w: "置く",
        y: "おく",
        m: "to put, set down",
        lvl: "N5",
      },
      {
        w: "出かける",
        y: "でかける",
        m: "to go out, set off",
        lvl: "N4",
      },
    ],
  },
  {
    jp: "海水浴シーズンには、ホテルで着替えて海に泳ぎに行くことができます。",
    en: "During the swimming season, you can change at the hotel and go swimming in the sea.",
    where: "Appeal — Beach",
    url: "https://resorthotel-mihagi.com/appeal/",
    grammar: [
      {
        p: "泳ぎに行く",
        d: "Verb-stem + に行く = 'go in order to (do).' 泳ぎに行く = 'go to swim.'",
      },
      {
        p: "〜ことができます",
        d: "Plain verb + ことができます = 'be able to ~.' Featured in the Grammar tab.",
      },
    ],
    vocab: [
      {
        w: "海水浴",
        y: "かいすいよく",
        m: "sea bathing, swimming in the sea",
        lvl: "N2",
      },
      {
        w: "着替える",
        y: "きがえる",
        m: "to change clothes",
        lvl: "N3",
      },
    ],
  },
  {
    jp: "透明度の高い海で思う存分遊んでください。",
    en: "Play to your heart's content in the crystal-clear sea.",
    where: "Appeal — Beach",
    url: "https://resorthotel-mihagi.com/appeal/",
    grammar: [
      {
        p: "〜度の高い",
        d: "Noun + 度（ど）の高い = 'high in ~.' 透明度の高い海 = 'a sea high in transparency,' i.e. very clear water.",
      },
      {
        p: "思う存分",
        d: "A set adverb meaning 'to one's heart's content / as much as one likes.'",
      },
    ],
    vocab: [
      {
        w: "透明度",
        y: "とうめいど",
        m: "transparency, clarity",
        lvl: "N1",
      },
      {
        w: "思う存分",
        y: "おもうぞんぶん",
        m: "to one's heart's content",
        lvl: "N1",
      },
    ],
  },
  {
    jp: "絶景の海側客室から城下町側の客室まで、多様なお部屋タイプからお選びいただけます。",
    en: "From stunning ocean-side rooms to castle-town-side rooms, you may choose from a wide variety of room types.",
    where: "Appeal — Rooms",
    url: "https://resorthotel-mihagi.com/appeal/",
    grammar: [
      {
        p: "〜から〜まで",
        d: "A から B まで = 'from A to B' — spanning a range, here from one room type to another.",
      },
      {
        p: "お選びいただけます",
        d: "Honorific お + verb-stem + いただけます = 'you may (kindly) choose.' See the keigo pattern in Grammar.",
      },
    ],
    vocab: [
      {
        w: "海側",
        y: "うみがわ",
        m: "ocean-facing side",
        lvl: "N4",
      },
      {
        w: "城下町",
        y: "じょうかまち",
        m: "castle town",
        lvl: "N2",
      },
      {
        w: "多様",
        y: "たよう",
        m: "diverse, varied (na-adj)",
        lvl: "N2",
      },
    ],
  },
  {
    jp: "海を望む露天風呂、夕景を眺めながらの入浴は心身ともに癒されます。",
    en: "In the open-air bath overlooking the sea, bathing while gazing at the evening view heals both body and mind.",
    where: "Appeal — Onsen",
    url: "https://resorthotel-mihagi.com/appeal/",
    grammar: [
      {
        p: "〜ながらの",
        d: "Verb-stem + ながら + の nominalizes a 'while ~ing' phrase into a noun modifier: 眺めながらの入浴 = 'bathing done while gazing.'",
      },
      {
        p: "癒される",
        d: "Passive of 癒す ('to heal') → 癒される = 'to be healed / soothed.'",
      },
    ],
    vocab: [
      {
        w: "望む",
        y: "のぞむ",
        m: "to command a view of, overlook",
        lvl: "N2",
      },
      {
        w: "眺める",
        y: "ながめる",
        m: "to gaze at",
        lvl: "N2",
      },
      {
        w: "心身",
        y: "しんしん",
        m: "body and mind",
        lvl: "N1",
      },
    ],
  },
  {
    jp: "温泉は、地下1500mから汲み上げている自家源泉の天然温泉。",
    en: "The hot spring is a natural one from the inn's own source, drawn up from 1,500 m underground.",
    where: "Home — Onsen",
    url: "https://resorthotel-mihagi.com/onsen/",
    grammar: [
      {
        p: "〜から（起点）",
        d: "Noun + から marks a starting point / origin: 地下1500mから = 'from 1,500 m underground.'",
      },
      {
        p: "汲み上げている（名詞修飾）",
        d: "The te-iru clause 汲み上げている ('is drawing up') modifies 天然温泉 as a relative clause. Note the sentence ends on a noun — common in marketing copy for a punchy feel.",
      },
    ],
    vocab: [
      {
        w: "地下",
        y: "ちか",
        m: "underground",
        lvl: "N3",
      },
      {
        w: "汲み上げる",
        y: "くみあげる",
        m: "to pump / draw up",
        lvl: "N1",
      },
      {
        w: "自家源泉",
        y: "じかげんせん",
        m: "one's own (private) spring source",
        lvl: "local",
      },
    ],
  },
  {
    jp: "お食事は地元の旬の食材にこだわった和食懐石料理をご堪能ください。",
    en: "For your meal, please savor kaiseki Japanese cuisine made with local, in-season ingredients.",
    where: "Home — Dishes",
    url: "https://resorthotel-mihagi.com/dishes/",
    grammar: [
      {
        p: "〜にこだわった",
        d: "Noun + にこだわった = '(that is) particular about ~,' modifying 和食懐石料理. See the にこだわる pattern in Grammar.",
      },
      {
        p: "ご堪能ください",
        d: "Honorific ご + 堪能 + ください = 'please savor / fully enjoy.' The polished keigo request.",
      },
    ],
    vocab: [
      {
        w: "地元",
        y: "じもと",
        m: "local (area)",
        lvl: "N3",
      },
      {
        w: "旬",
        y: "しゅん",
        m: "in season",
        lvl: "N2",
      },
      {
        w: "懐石料理",
        y: "かいせきりょうり",
        m: "kaiseki course cuisine",
        lvl: "N1",
      },
    ],
  },
];

/* ---------- CULTURE ---------- */
const CULTURE = [
  {
    icon: Sun,
    jp: "夕陽の海辺リゾート",
    en: "The sunset seaside resort",
    body: "Mihagi sits directly on Kikugahama, a beach chosen among Japan's '100 best sunsets' (夕陽百選). The whole property is built around the idea of the フォトメモリー — a single photo with someone you love. Expect a 幸せの鐘 ('bell of happiness') photo spot and copy that frames the whole stay as one album page. Come for golden hour: the 夕暮れ light over the Sea of Japan is the thesis of the place.",
    terms: ["絶景", "夕陽", "菊ヶ浜"],
  },
  {
    icon: Waves,
    jp: "温泉と露天風呂",
    en: "Hot springs & open-air baths",
    body: "The bath water is a 天然温泉 drawn from the inn's own source 1,500 m underground. The signature experience is the 露天風呂 — an open-air bath where you soak while the sun sets over the water. Look for a 貸切 (private) option if you'd rather not share the view, and a lobby 足湯 (foot bath) for a quick, clothed soak. Onsen etiquette: rinse fully before entering, and the towel never touches the water.",
    terms: ["温泉", "露天風呂", "貸切", "足湯"],
  },
  {
    icon: Utensils,
    jp: "旬の和食懐石",
    en: "Seasonal kaiseki dining",
    body: "Dinner is 和食懐石料理 — a multi-course meal that changes with the calendar. The kitchen is proud of being 旬にこだわる: leaning on whatever local 食材 are at their peak, much of it pulled from the Sea of Japan that morning. 'The mountain's gifts and the sea's gifts' (山の幸・海の幸) is a phrase you'll see. Pace yourself — courses arrive in a deliberate order, each a small seasonal statement.",
    terms: ["懐石料理", "旬", "食材", "地元"],
  },
  {
    icon: Landmark,
    jp: "萩の城下町",
    en: "Hagi, the castle town",
    body: "The hotel's address — Horiuchi, Hagi — sits inside a preserved 城下町, the old samurai quarter of a former castle town in Yamaguchi. Hagi is a UNESCO World Heritage site tied to Japan's industrial revolution and is famous for 萩焼 (Hagi-yaki pottery). A short 散策 from the beach takes you past white earthen walls and orange 夏みかん trees. The 景観 pairs a quiet, historic townscape with a wide-open coast.",
    terms: ["城下町", "散策", "景観"],
  },
];

/* ============================================================
   Furigana system
   ============================================================ */
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

/* ---------- audio ---------- */
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

/* ---------- LevelBadge ---------- */
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

/* ============================================================
   VocabPill (culture chips with popover)
   ============================================================ */
function VocabPill({
  term,
}) {
  const v = VOCAB_MAP[term];
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState("above");
  const wrapRef = useRef(null);
  const hideT = useRef(null);
  const showFuri = useFurigana();

  const reveal = () => {
    clearTimeout(hideT.current);
    if (wrapRef.current) {
      const top = wrapRef.current.getBoundingClientRect().top;
      setPos(top < 130 ? "below" : "above");
    }
    setOpen(true);
  };
  const hide = () => { hideT.current = setTimeout(() => setOpen(false), 120); };

  useEffect(() => {
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => { document.removeEventListener("mousedown", onDown); clearTimeout(hideT.current); };
  }, []);

  if (!v) return <span className="hg-chip">{term}</span>;

  return (
    <span
      className="hg-pill-wrap"
      ref={wrapRef}
      onMouseEnter={reveal}
      onMouseLeave={hide}
    >
      <button
        className="hg-chip"
        onClick={() => speak(v.jp)}
        onFocus={reveal}
        onBlur={hide}
        aria-label={`${v.jp} — ${v.en}. Tap to hear.`}
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
          role="tooltip"
        >
          <span className="hg-pop-jp">
            <Furi
              kanji={v.jp}
              yomi={v.yomi}
            />
          </span>
          <span className="hg-pop-yomi">{v.yomi}</span>
          <span className="hg-pop-en">{v.en}</span>
          <LevelBadge lvl={v.lvl} />
        </span>
      )}
    </span>
  );
}

/* ============================================================
   Culture tab
   ============================================================ */
function Culture() {
  return (
    <section className="hg-pane">
      <p className="hg-lede">
        A seaside inn whose whole pitch is one photo with someone you love — sunsets over the
        Sea of Japan, open-air baths, kaiseki dinners, and a preserved castle town at the door.
      </p>
      <div className="hg-culture-grid">
        {CULTURE.map((c) => {
          const Icon = c.icon;
          return (
            <article
              className="hg-culture-card"
              key={c.jp}
            >
              <div className="hg-culture-head">
                <span className="hg-culture-icon">
                  <Icon size={19} />
                </span>
                <div>
                  <h3 className="hg-culture-jp">{c.jp}</h3>
                  <div className="hg-culture-en">{c.en}</div>
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
            </article>
          );
        })}
      </div>
    </section>
  );
}

/* ============================================================
   Vocab tab (flip cards)
   ============================================================ */
function FlipCard({
  v,
}) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div
      className="hg-flip"
      data-flipped={flipped}
      tabIndex={0}
      role="button"
      onClick={() => { setFlipped(f => !f); speak(v.jp); }}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setFlipped(f => !f); speak(v.jp); } }}
      aria-label={`${v.jp}: ${v.en}`}
    >
      <div className="hg-flip-inner">
        <div className="hg-face hg-front">
          <span className="hg-vocab-jp">
            <Furi
              kanji={v.jp}
              yomi={v.yomi}
            />
          </span>
          <LevelBadge lvl={v.lvl} />
        </div>
        <div className="hg-face hg-back">
          <span className="hg-vocab-en">{v.en}</span>
          <span className="hg-vocab-yomi">{v.yomi}</span>
          <LevelBadge lvl={v.lvl} />
        </div>
      </div>
    </div>
  );
}

function Vocab() {
  const [cat, setCat] = useState("all");
  const list = useMemo(
    () => (cat === "all" ? VOCAB : VOCAB.filter(v => v.cat === cat)),
    [cat],
  );
  return (
    <section className="hg-pane">
      <p className="hg-hint">Tap a card to flip it and hear the word. The badge turns coral for words above N3.</p>
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
              <Icon size={15} />
              {" "}
              <span className="hg-filter-jp">{c.jp}</span>
              <span className="hg-filter-en">{c.en}</span>
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
    </section>
  );
}

/* ============================================================
   Grammar tab (accordion)
   ============================================================ */
function ExLine({
  ex,
}) {
  const [show, setShow] = useState(false);
  return (
    <li className="hg-ex">
      <button
        className="hg-ex-jp"
        onClick={() => speak(ex.jp)}
      >{ex.jp}
      </button>
      <div
        className="hg-ex-en"
        data-show={show}
        onClick={() => setShow(s => !s)}
      >
        {show ? ex.en : "Tap to reveal translation"}
      </div>
    </li>
  );
}

function Grammar() {
  const [open, setOpen] = useState(0);
  return (
    <section className="hg-pane">
      <p className="hg-hint">Five patterns pulled straight from the inn's own copy. Tap a Japanese line to hear it.</p>
      <div className="hg-accordion">
        {GRAMMAR.map((g, i) => {
          const isOpen = open === i;
          return (
            <div
              className="hg-acc-item"
              data-open={isOpen}
              key={g.pat}
            >
              <button
                className="hg-acc-head"
                onClick={() => setOpen(isOpen ? -1 : i)}
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
              {isOpen && (
                <div className="hg-acc-body">
                  <p className="hg-acc-note">{g.note}</p>
                  <ul className="hg-exlist">
                    {g.ex.map((ex, j) => (
                      <ExLine
                        ex={ex}
                        key={j}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ============================================================
   Source tab
   ============================================================ */
function SourceCard({
  s, n,
}) {
  const [open, setOpen] = useState(false);
  return (
    <article className="hg-src-card">
      <div className="hg-src-top">
        <span className="hg-src-num">{String(n).padStart(2, "0")}</span>
        <span className="hg-src-where">
          <MapPin size={12} />
          {" "}
          {s.where}
        </span>
        <button
          className="hg-src-audio"
          onClick={() => speak(s.jp)}
          aria-label="Play sentence"
        >
          <Volume2 size={16} />
        </button>
      </div>
      <p className="hg-src-jp">{s.jp}</p>
      <button
        className="hg-src-reveal"
        data-open={open}
        onClick={() => setOpen(o => !o)}
      >
        {open ? s.en : "Tap to reveal the English"}
      </button>
      {open && (
        <div className="hg-src-break">
          <div>
            <h4 className="hg-src-h">Grammar</h4>
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
            <h4 className="hg-src-h">Vocabulary</h4>
            {s.vocab.map((v, i) => (
              <div
                key={i}
                className="hg-src-vrow"
              >
                <span className="hg-src-vw">
                  <Furi
                    kanji={v.w}
                    yomi={v.y}
                  />
                </span>
                <span className="hg-src-vm">{v.m}</span>
                <LevelBadge lvl={v.lvl} />
              </div>
            ))}
          </div>
        </div>
      )}
      <a
        className="hg-src-link"
        href={s.url}
        target="_blank"
        rel="noreferrer"
      >source page ↗
      </a>
    </article>
  );
}

function SourceSentences() {
  return (
    <section className="hg-pane">
      <p className="hg-hint">
        Ten sentences lifted verbatim from
        {" "}
        <a
          href="https://resorthotel-mihagi.com/"
          target="_blank"
          rel="noreferrer"
        >resorthotel-mihagi.com
        </a>
        ,
        ordered roughly simple → keigo. Reveal each for a grammar + vocab breakdown.
      </p>
      <div className="hg-src-list">
        {SOURCE.map((s, i) => (
          <SourceCard
            s={s}
            n={i + 1}
            key={i}
          />
        ))}
      </div>
    </section>
  );
}

/* ============================================================
   Practice tab
   ============================================================ */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function Practice() {
  const [dir, setDir] = useState("jp-en"); // jp-en | en-jp
  const [phase, setPhase] = useState("setup"); // setup | drill | done
  const [deck, setDeck] = useState([]);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [right, setRight] = useState(0);

  const start = () => {
    setDeck(shuffle(VOCAB));
    setIdx(0); setRevealed(false); setRight(0); setPhase("drill");
  };
  const grade = (ok) => {
    if (ok) setRight(r => r + 1);
    if (idx + 1 >= deck.length) setPhase("done");
    else { setIdx(i => i + 1); setRevealed(false); }
  };

  if (phase === "setup") {
    return (
      <section className="hg-pane hg-practice-setup">
        <div className="hg-setup-card">
          <RefreshCw
            size={30}
            style={{
              color: "var(--citrus)",
            }}
          />
          <h3 className="hg-setup-title">Self-graded drill</h3>
          <p className="hg-setup-sub">All {VOCAB.length} words, shuffled. Grade yourself honestly.</p>
          <div
            className="hg-seg"
            role="group"
            aria-label="Direction"
          >
            <button
              data-active={dir === "jp-en"}
              onClick={() => setDir("jp-en")}
            >日本語 → EN
            </button>
            <button
              data-active={dir === "en-jp"}
              onClick={() => setDir("en-jp")}
            >EN → 日本語
            </button>
          </div>
          <div style={{
            marginTop: 22,
          }}
          >
            <button
              className="hg-primary"
              onClick={start}
            >
              Start
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (phase === "done") {
    const pct = Math.round((right / deck.length) * 100);
    return (
      <section className="hg-pane hg-practice-setup">
        <div className="hg-setup-card">
          <div
            className="hg-result-ring"
            style={{
              "--pct": pct,
            }}
          >
            <span>{pct}%</span>
          </div>
          <h3 className="hg-setup-title">{right} / {deck.length} recalled</h3>
          <p className="hg-setup-sub">
            {pct >= 80 ? "見事！ Beautifully done." : pct >= 50 ? "その調子！ Keep going." : "大丈夫、もう一回！ Round two helps."}
          </p>
          <div style={{
            marginTop: 22,
          }}
          >
            <button
              className="hg-primary"
              onClick={start}
            >
              <RotateCcw size={16} />
              {" "}
              Again
            </button>
          </div>
        </div>
      </section>
    );
  }

  const v = deck[idx];
  const prompt = dir === "jp-en"
    ? (
      <span className="hg-quiz-jp">
        <Furi
          kanji={v.jp}
          yomi={v.yomi}
        />
      </span>
    )
    : <span className="hg-quiz-en-prompt">{v.en}</span>;
  const answer = dir === "jp-en"
    ? (
      <>
        <div className="hg-quiz-a-en">{v.en}</div>
        <div className="hg-quiz-a-yomi">{v.yomi}</div>
      </>
    )
    : (
      <span className="hg-quiz-jp">
        <Furi
          kanji={v.jp}
          yomi={v.yomi}
        />
      </span>
    );

  return (
    <section className="hg-pane">
      <div className="hg-quiz-progress">
        <div
          className="hg-quiz-bar"
          style={{
            width: `${(idx / deck.length) * 100}%`,
          }}
        />
      </div>
      <div className="hg-quiz-count">{idx + 1} / {deck.length}</div>
      <div className="hg-quizcard">
        {prompt}
        {revealed && <div className="hg-quiz-answer">{answer}</div>}
      </div>
      {!revealed
        ? (
          <button
            className="hg-reveal-btn"
            onClick={() => { setRevealed(true); speak(v.jp); }}
          >
            <Eye size={17} />
            {" "}
            Show answer
          </button>
        )
        : (
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
        )}
    </section>
  );
}

/* ============================================================
   App
   ============================================================ */
export default function App() {
  const [tab, setTab] = useState("culture");
  const [furi, setFuri] = useState(true);

  const render = () => {
    switch (tab) {
      case "culture": return <Culture />;
      case "vocab": return <Vocab />;
      case "grammar": return <Grammar />;
      case "source": return <SourceSentences />;
      case "practice": return <Practice />;
      default: return null;
    }
  };

  return (
    <FuriganaCtx.Provider value={furi}>
      <style>{CSS}</style>
      <div className="hg-root">
        <header className="hg-header">
          <div className="hg-header-inner">
            <div className="hg-scroll">海が奏でる癒しの宿</div>
            <div className="hg-title-block">
              <div className="hg-eyebrow">Seaside Japanese · Hagi, Yamaguchi</div>
              <h1 className="hg-title">
                美萩
                <span className="hg-dot" />
              </h1>
              <div className="hg-sub">
                A Japanese lesson built from Resort Hotel Mihagi — sunsets, onsen, kaiseki & a castle town.
              </div>
            </div>
            <button
              className="hg-furi-toggle"
              aria-pressed={furi}
              onClick={() => setFuri(f => !f)}
            >
              <span className="hg-furi-kanji">{furi ? "振" : "漢"}</span>
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

        <main className="hg-main">{render()}</main>

        <footer className="hg-footer">
          Source:
          {" "}
          <a
            href="https://resorthotel-mihagi.com/"
            target="_blank"
            rel="noreferrer"
          >リゾートホテル美萩 (resorthotel-mihagi.com)
          </a>
          .
          A study aid — Japanese text quoted from the hotel's public site for language learning.
        </footer>
      </div>
    </FuriganaCtx.Provider>
  );
}

/* ============================================================
   CSS — palette derived from Kikugahama at sunset:
   sea-teal (dark), sunset coral (accent), warm sand (bg)
   ============================================================ */
const CSS = `
:root{
  --indigo:#1C4E63; --indigo2:#24657F; --indigo-ink:#10323F;
  --plaster:#FBF5EC; --plaster2:#F2E6D4; --card:#FFFDF8;
  --citrus:#F0895B; --citrus-deep:#D9663D; --citrus-soft:#FBD9C4;
  --sumi:#253138; --stone:#7C8688; --glaze:#E6D9C7;
  --sea:#3DA9A6;
  --line:rgba(37,49,56,.13); --line2:rgba(37,49,56,.08);
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

/* header */
.hg-header{background:var(--indigo);color:var(--plaster);position:relative;overflow:hidden;}
.hg-header::after{content:"";position:absolute;right:-60px;top:-70px;width:230px;height:230px;border-radius:50%;
  background:radial-gradient(circle at 35% 35%,var(--citrus),var(--citrus-deep));opacity:.92;}
.hg-header::before{content:"";position:absolute;left:0;right:0;bottom:0;height:120px;
  background:linear-gradient(180deg,transparent,rgba(61,169,166,.10));pointer-events:none;}
.hg-header-inner{max-width:1080px;margin:0 auto;padding:28px 24px 20px;position:relative;z-index:2;display:flex;align-items:flex-start;gap:20px;}
.hg-scroll{writing-mode:vertical-rl;font-family:var(--jp-serif);font-size:15px;letter-spacing:.28em;color:var(--citrus-soft);
  border-right:1px solid rgba(251,217,196,.3);padding-right:12px;min-height:110px;flex:none;}
.hg-title-block{flex:1;min-width:0;}
.hg-eyebrow{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--citrus-soft);font-weight:600;}
.hg-title{font-family:var(--jp-serif);font-size:52px;line-height:1;margin:6px 0 0;font-weight:600;color:#fff;}
.hg-dot{display:inline-block;width:12px;height:12px;border-radius:50%;background:var(--citrus);margin-left:6px;}
.hg-sub{margin-top:12px;font-size:13px;color:rgba(243,236,221,.78);max-width:52ch;}

.hg-furi-toggle{flex:none;align-self:flex-start;display:flex;flex-direction:column;align-items:center;gap:4px;padding:9px 13px;
  background:rgba(255,255,255,.08);border:1px solid rgba(251,217,196,.22);border-radius:10px;color:var(--plaster);transition:.18s;position:relative;z-index:2;}
.hg-furi-toggle:hover{background:rgba(255,255,255,.14);border-color:var(--citrus-soft);}
.hg-furi-toggle[aria-pressed="true"]{border-color:var(--citrus);background:rgba(240,137,91,.2);}
.hg-furi-kanji{font-family:var(--jp-serif);font-size:22px;line-height:1.25;}
.hg-furi-label{font-family:var(--jp-sans);font-size:9px;letter-spacing:.05em;color:rgba(243,236,221,.6);white-space:nowrap;}

/* tabs */
.hg-tabs{max-width:1080px;margin:0 auto;padding:0 16px;display:flex;gap:2px;overflow-x:auto;position:relative;z-index:2;}
.hg-tab{background:transparent;border:none;color:rgba(243,236,221,.6);padding:11px 15px 13px;display:flex;align-items:center;gap:7px;
  border-bottom:2.5px solid transparent;white-space:nowrap;transition:color .18s;font-size:13px;}
.hg-tab-jp{font-family:var(--jp-sans);font-weight:700;}
.hg-tab-en{opacity:.75;font-size:12px;}
.hg-tab[data-active="true"]{color:#fff;border-color:var(--citrus);}

/* pane */
.hg-main{max-width:1080px;margin:0 auto;padding:26px 24px 10px;}
.hg-pane{animation:fade .32s ease;}
@keyframes fade{from{opacity:0;transform:translateY(5px);}to{opacity:1;transform:none;}}
.hg-lede{font-family:var(--en-serif);font-size:18px;line-height:1.55;max-width:62ch;margin:0 0 24px;}
.hg-hint{font-size:13px;color:var(--stone);margin:0 0 16px;}

/* culture */
.hg-culture-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:16px;}
.hg-culture-card{background:var(--card);border:1px solid var(--line);border-left:3px solid var(--citrus);border-radius:4px;padding:18px 20px;}
.hg-culture-head{display:flex;gap:12px;align-items:center;margin-bottom:11px;}
.hg-culture-icon{width:36px;height:36px;border-radius:50%;background:var(--indigo);color:var(--citrus-soft);display:grid;place-items:center;flex:none;}
.hg-culture-jp{font-family:var(--jp-serif);font-size:19px;margin:0;font-weight:600;}
.hg-culture-en{font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--stone);}
.hg-culture-body{font-size:14px;line-height:1.62;margin:0 0 13px;}
.hg-chips{display:flex;flex-wrap:wrap;gap:7px;}

/* pill + popover */
.hg-pill-wrap{position:relative;display:inline-block;}
.hg-chip{font-family:var(--jp-sans);font-size:13px;background:var(--plaster2);border:1px solid var(--line);border-radius:999px;
  padding:3px 12px 4px;line-height:1.9;color:var(--sumi);transition:.15s;cursor:pointer;}
.hg-chip:hover,.hg-chip:focus-visible{background:var(--citrus);border-color:var(--citrus);color:#fff;outline:none;}
.hg-chip:hover .hg-rt,.hg-chip:focus-visible .hg-rt{color:rgba(255,255,255,.8);}
.hg-popover{position:absolute;left:50%;transform:translateX(-50%);background:var(--indigo-ink);color:var(--plaster);border-radius:8px;
  padding:10px 13px 9px;min-width:140px;max-width:210px;width:max-content;box-shadow:0 8px 24px rgba(16,50,63,.4),0 2px 6px rgba(0,0,0,.2);
  z-index:999;display:flex;flex-direction:column;gap:3px;animation:popIn .14s ease;}
@keyframes popIn{from{opacity:0;transform:translateX(-50%) scale(.93);}to{opacity:1;transform:translateX(-50%) scale(1);}}
.hg-popover[data-pos="above"]{bottom:calc(100% + 9px);}
.hg-popover[data-pos="below"]{top:calc(100% + 9px);}
.hg-popover[data-pos="above"]::after{content:"";position:absolute;bottom:-5px;left:50%;transform:translateX(-50%);border:5px solid transparent;border-top-color:var(--indigo-ink);border-bottom:none;}
.hg-popover[data-pos="below"]::after{content:"";position:absolute;top:-5px;left:50%;transform:translateX(-50%);border:5px solid transparent;border-bottom-color:var(--indigo-ink);border-top:none;}
.hg-pop-jp{font-family:var(--jp-serif);font-size:20px;font-weight:600;}
.hg-pop-yomi{font-family:var(--jp-sans);font-size:11.5px;color:rgba(243,236,221,.55);}
.hg-pop-en{font-size:12.5px;color:rgba(243,236,221,.88);}
.hg-popover .hg-badge{align-self:flex-start;margin-top:3px;background:rgba(255,255,255,.1);color:var(--citrus-soft);}
.hg-popover .hg-badge[data-jlpt="yes"]{background:var(--citrus);color:#fff;}

/* badge */
.hg-badge{font-size:9.5px;font-weight:700;padding:2px 6px;border-radius:4px;background:var(--plaster2);color:var(--stone);letter-spacing:.03em;}
.hg-badge[data-jlpt="yes"]{background:var(--citrus);color:#fff;}

/* vocab filter */
.hg-filter{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:6px;}
.hg-filter-btn{display:inline-flex;align-items:center;gap:6px;background:var(--card);border:1px solid var(--line);border-radius:999px;
  padding:7px 14px;font-size:13px;color:var(--sumi);transition:.15s;}
.hg-filter-btn:hover{border-color:var(--citrus);}
.hg-filter-btn[data-active="true"]{background:var(--indigo);border-color:var(--indigo);color:#fff;}
.hg-filter-jp{font-family:var(--jp-sans);font-weight:700;}
.hg-filter-en{opacity:.7;font-size:11.5px;}

/* flip cards */
.hg-cardgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:12px;margin-top:14px;}
.hg-flip{height:162px;perspective:1000px;outline:none;}
.hg-flip:focus-visible .hg-face{box-shadow:0 0 0 2px var(--citrus);}
.hg-flip-inner{position:relative;width:100%;height:100%;transition:transform .5s;transform-style:preserve-3d;}
.hg-flip[data-flipped="true"] .hg-flip-inner{transform:rotateY(180deg);}
.hg-face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:6px;border:1px solid var(--line);
  padding:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;}
.hg-front{background:var(--card);}
.hg-back{background:var(--indigo);color:var(--plaster);transform:rotateY(180deg);}
.hg-vocab-jp{font-family:var(--jp-serif);font-size:26px;font-weight:600;line-height:1.5;}
.hg-vocab-en{font-size:15px;font-weight:600;line-height:1.35;}
.hg-vocab-yomi{font-family:var(--jp-sans);font-size:12px;color:var(--citrus-soft);margin-top:6px;}
.hg-face .hg-badge{position:absolute;bottom:8px;right:9px;}
.hg-back .hg-badge{background:rgba(251,217,196,.15);color:var(--citrus-soft);}
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

/* source */
.hg-src-list{display:flex;flex-direction:column;gap:15px;}
.hg-src-card{background:var(--card);border:1px solid var(--line);border-radius:6px;border-top:3px solid var(--sea);padding:14px 19px 15px;position:relative;}
.hg-src-top{display:flex;align-items:center;gap:10px;margin-bottom:9px;}
.hg-src-num{font-family:var(--en-serif);font-size:15px;font-weight:700;color:var(--citrus-deep);}
.hg-src-where{display:inline-flex;align-items:center;gap:4px;font-size:11px;letter-spacing:.04em;color:var(--stone);}
.hg-src-audio{margin-left:auto;background:var(--plaster2);border:1px solid var(--line);border-radius:8px;color:var(--indigo);width:30px;height:30px;display:grid;place-items:center;transition:.15s;}
.hg-src-audio:hover{background:var(--citrus);border-color:var(--citrus);color:#fff;}
.hg-src-jp{font-family:var(--jp-serif);font-size:22px;line-height:1.55;margin:0;font-weight:500;}
.hg-src-reveal{display:block;width:100%;text-align:left;margin-top:13px;background:var(--plaster2);border:1px dashed var(--line);border-radius:5px;
  padding:10px 13px;font-family:var(--en-serif);font-size:15px;color:var(--stone);font-style:italic;}
.hg-src-reveal[data-open="true"]{background:transparent;border-style:solid;border-color:var(--citrus-soft);color:var(--sumi);font-style:normal;}
.hg-src-break{margin-top:13px;padding-top:14px;border-top:1px solid var(--line2);display:grid;grid-template-columns:1fr 1fr;gap:20px;}
.hg-src-h{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--citrus-deep);margin:0 0 9px;font-weight:700;}
.hg-src-gpat{font-family:var(--jp-sans);font-size:13.5px;font-weight:700;}
.hg-src-gdesc{font-size:12.5px;line-height:1.55;color:var(--sumi);}
.hg-src-vrow{display:flex;align-items:center;gap:9px;margin-bottom:7px;flex-wrap:wrap;}
.hg-src-vw{font-family:var(--jp-serif);font-size:16px;font-weight:600;}
.hg-src-vm{font-size:12.5px;color:var(--stone);flex:1;min-width:110px;}
.hg-src-link{display:inline-block;margin-top:12px;font-size:11.5px;color:var(--sea);text-decoration:none;letter-spacing:.03em;}
.hg-src-link:hover{text-decoration:underline;}

/* practice */
.hg-practice-setup{display:flex;justify-content:center;padding-top:8px;}
.hg-setup-card{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:28px 28px 32px;max-width:440px;width:100%;text-align:center;}
.hg-setup-title{font-family:var(--jp-serif);font-size:21px;margin:14px 0 4px;font-weight:600;}
.hg-setup-sub{font-size:13.5px;color:var(--stone);margin:0 0 18px;}
.hg-seg{display:inline-flex;background:var(--plaster2);border-radius:999px;padding:3px;gap:3px;}
.hg-seg button{border:none;background:transparent;padding:7px 14px;border-radius:999px;font-size:13px;color:var(--sumi);font-family:var(--jp-sans);}
.hg-seg button[data-active="true"]{background:var(--indigo);color:#fff;}
.hg-primary{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:var(--citrus);color:#fff;border:none;border-radius:999px;
  padding:12px 24px;font-size:15px;font-weight:600;box-shadow:0 5px 16px rgba(240,137,91,.32);transition:.15s;}
.hg-primary:hover{background:var(--citrus-deep);}
.hg-quiz-progress{height:5px;background:var(--plaster2);border-radius:999px;overflow:hidden;margin-bottom:8px;}
.hg-quiz-bar{height:100%;background:var(--citrus);transition:width .3s;}
.hg-quiz-count{text-align:center;font-size:12px;color:var(--stone);margin-bottom:12px;}
.hg-quizcard{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:40px 24px;text-align:center;min-height:220px;
  display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;}
.hg-quiz-jp{font-family:var(--jp-serif);font-size:38px;font-weight:600;line-height:1.6;}
.hg-quiz-en-prompt{font-family:var(--en-serif);font-size:26px;font-style:italic;}
.hg-quiz-answer{border-top:1px solid var(--line);padding-top:16px;width:100%;}
.hg-quiz-a-en{font-family:var(--en-serif);font-size:19px;}
.hg-quiz-a-yomi{font-family:var(--jp-sans);font-size:14px;color:var(--citrus-deep);margin-top:5px;}
.hg-reveal-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;margin-top:14px;background:var(--indigo);color:#fff;border:none;
  border-radius:8px;padding:14px;font-size:15px;font-weight:600;transition:.15s;}
.hg-reveal-btn:hover{background:var(--indigo2);}
.hg-grade{display:flex;gap:11px;margin-top:14px;}
.hg-grade-btn{flex:1;display:flex;align-items:center;justify-content:center;gap:7px;padding:13px;border-radius:8px;font-size:14px;font-weight:600;border:1.5px solid;background:transparent;}
.hg-grade-btn.review{border-color:var(--stone);color:var(--sumi);}
.hg-grade-btn.good{background:var(--indigo);border-color:var(--indigo);color:#fff;}
.hg-result-ring{width:116px;height:116px;border-radius:50%;margin:0 auto 16px;display:grid;place-items:center;
  background:conic-gradient(var(--citrus) calc(var(--pct)*1%),var(--plaster2) 0);}
.hg-result-ring span{width:88px;height:88px;border-radius:50%;background:var(--card);display:grid;place-items:center;font-family:var(--en-serif);font-size:25px;font-weight:600;}

/* footer */
.hg-footer{max-width:1080px;margin:24px auto 0;padding:18px 24px 30px;border-top:1px solid var(--line);font-size:12px;color:var(--stone);line-height:1.6;}

@media (max-width:560px){
  .hg-scroll{display:none;}
  .hg-title{font-size:40px;}
  .hg-header-inner{padding:20px 16px 16px;flex-wrap:wrap;}
  .hg-main{padding:20px 14px 8px;}
  .hg-tab-en{display:none;}
  .hg-src-break{grid-template-columns:1fr;gap:16px;}
}
@media (prefers-reduced-motion:reduce){*{transition:none !important;animation:none !important;}}
`;

import { useState, useMemo, useContext, createContext, useRef, useEffect, useCallback } from "react";

import {
  Landmark, BookOpen, Utensils, Bus, Home,
  RotateCcw, Check, RefreshCw, Eye, EyeOff, ChevronDown,
  Volume2, GraduationCap, ArrowRight, Sparkles,
  ScrollText, ExternalLink, Layers,
} from "lucide-react";

/* ── Context: furigana on/off ─────────────────────────────────────── */
const FuriganaCtx = createContext(true);
const useFurigana = () => useContext(FuriganaCtx);

/* ── Furi component ───────────────────────────────────────────────── */
function Furi({
  kanji, yomi, className,
}) {
  const show = useFurigana();
  if (show) return (
    <ruby className={className}>
      {kanji}
      <rt className="hg-rt">{yomi}</rt>
    </ruby>
  );
  return <span className={className}>{kanji}</span>;
}

/* ── DATA ─────────────────────────────────────────────────────────── */
const VOCAB = [
  {
    jp: "宿",
    yomi: "やど",
    en: "inn, lodging",
    lvl: "N5",
    cat: "lodging",
  },
  {
    jp: "旅館",
    yomi: "りょかん",
    en: "traditional inn",
    lvl: "N4",
    cat: "lodging",
  },
  {
    jp: "予約",
    yomi: "よやく",
    en: "reservation",
    lvl: "N4",
    cat: "lodging",
  },
  {
    jp: "宿泊",
    yomi: "しゅくはく",
    en: "lodging, overnight stay",
    lvl: "N3",
    cat: "lodging",
  },
  {
    jp: "素泊まり",
    yomi: "すどまり",
    en: "room only (no meals)",
    lvl: "travel",
    cat: "lodging",
  },
  {
    jp: "温泉",
    yomi: "おんせん",
    en: "hot spring",
    lvl: "N4",
    cat: "lodging",
  },
  {
    jp: "大浴場",
    yomi: "だいよくじょう",
    en: "large communal bath",
    lvl: "N2",
    cat: "lodging",
  },
  {
    jp: "貸切風呂",
    yomi: "かしきりぶろ",
    en: "private / reserved bath",
    lvl: "inn",
    cat: "lodging",
  },
  {
    jp: "和室",
    yomi: "わしつ",
    en: "Japanese-style (tatami) room",
    lvl: "N3",
    cat: "lodging",
  },
  {
    jp: "料理",
    yomi: "りょうり",
    en: "cuisine, dish",
    lvl: "N5",
    cat: "dining",
  },
  {
    jp: "料亭",
    yomi: "りょうてい",
    en: "traditional fine restaurant",
    lvl: "N1",
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
    jp: "旬",
    yomi: "しゅん",
    en: "in season",
    lvl: "N2",
    cat: "dining",
  },
  {
    jp: "刺身",
    yomi: "さしみ",
    en: "sashimi",
    lvl: "N4",
    cat: "dining",
  },
  {
    jp: "見蘭牛",
    yomi: "けんらんぎゅう",
    en: "Kenran beef (Hagi brand)",
    lvl: "local",
    cat: "dining",
  },
  {
    jp: "串揚げ",
    yomi: "くしあげ",
    en: "deep-fried skewers",
    lvl: "food",
    cat: "dining",
  },
  {
    jp: "夕食",
    yomi: "ゆうしょく",
    en: "dinner",
    lvl: "N4",
    cat: "dining",
  },
  {
    jp: "朝食",
    yomi: "ちょうしょく",
    en: "breakfast",
    lvl: "N4",
    cat: "dining",
  },
  {
    jp: "歴史",
    yomi: "れきし",
    en: "history",
    lvl: "N4",
    cat: "culture",
  },
  {
    jp: "世界遺産",
    yomi: "せかいいさん",
    en: "World Heritage",
    lvl: "N2",
    cat: "culture",
  },
  {
    jp: "城",
    yomi: "しろ",
    en: "castle",
    lvl: "N4",
    cat: "culture",
  },
  {
    jp: "城下町",
    yomi: "じょうかまち",
    en: "castle town",
    lvl: "N2",
    cat: "culture",
  },
  {
    jp: "神社",
    yomi: "じんじゃ",
    en: "shrine",
    lvl: "N4",
    cat: "culture",
  },
  {
    jp: "維新",
    yomi: "いしん",
    en: "(Meiji) Restoration",
    lvl: "N1",
    cat: "culture",
  },
  {
    jp: "老舗",
    yomi: "しにせ",
    en: "long-established shop",
    lvl: "N1",
    cat: "culture",
  },
  {
    jp: "萩焼",
    yomi: "はぎやき",
    en: "Hagi ware (pottery)",
    lvl: "local",
    cat: "culture",
  },
  {
    jp: "お土産",
    yomi: "おみやげ",
    en: "souvenir",
    lvl: "N4",
    cat: "culture",
  },
  {
    jp: "駅",
    yomi: "えき",
    en: "station",
    lvl: "N5",
    cat: "transit",
  },
  {
    jp: "バスセンター",
    yomi: "ばすせんたー",
    en: "bus terminal",
    lvl: "travel",
    cat: "transit",
  },
  {
    jp: "徒歩",
    yomi: "とほ",
    en: "on foot",
    lvl: "N3",
    cat: "transit",
  },
  {
    jp: "道",
    yomi: "みち",
    en: "road, way",
    lvl: "N5",
    cat: "transit",
  },
  {
    jp: "地図",
    yomi: "ちず",
    en: "map",
    lvl: "N4",
    cat: "transit",
  },
  {
    jp: "時刻表",
    yomi: "じこくひょう",
    en: "timetable",
    lvl: "N3",
    cat: "transit",
  },
];

const VOCAB_MAP = Object.fromEntries(VOCAB.map(v => [v.jp, v]));

const CATS = {
  all: {
    jp: "すべて",
    en: "All",
    icon: Sparkles,
  },
  lodging: {
    jp: "宿",
    en: "Lodging",
    icon: Home,
  },
  dining: {
    jp: "食事",
    en: "Dining",
    icon: Utensils,
  },
  culture: {
    jp: "文化",
    en: "Culture",
    icon: Landmark,
  },
  transit: {
    jp: "移動",
    en: "Transit",
    icon: Bus,
  },
};

const GRAMMAR = [
  {
    pat: "〜たいんですが",
    gloss: "I'd like to ~, ... (softened request)",
    note: "Verb-stem + たい means 'want to.' Adding んですが sets up context and softens the ask, inviting the listener to help — the single most useful travel opener.",
    ex: [
      {
        jp: "萩温泉に入りたいんですが、大浴場は何時までですか。",
        en: "I'd like to use the Hagi hot spring — until what time is the large bath open?",
      },
      {
        jp: "見蘭牛のステーキを食べたいんですが、予約は必要ですか。",
        en: "I'd like to have the Kenran beef steak — do I need a reservation?",
      },
      {
        jp: "世界遺産を見に行きたいんですが、バスセンターはどこですか。",
        en: "I'd like to go see the World Heritage sites — where is the bus terminal?",
      },
    ],
  },
  {
    pat: "〜てもいいですか",
    gloss: "May I ~? (asking permission)",
    note: "て-form + もいいですか. Your key for photos, an early check-in, or using a facility.",
    ex: [
      {
        jp: "写真を撮ってもいいですか。",
        en: "May I take a photo?",
      },
      {
        jp: "少し早くチェックインしてもいいですか。",
        en: "May I check in a little early?",
      },
      {
        jp: "貸切風呂を使ってもいいですか。",
        en: "May I use the private bath?",
      },
    ],
  },
  {
    pat: "〜ていただけますか",
    gloss: "Could you please ~? (polite request)",
    note: "て-form + いただけますか. Politer than 〜てください — ideal for asking inn or shop staff to do something for you.",
    ex: [
      {
        jp: "この料理を説明していただけますか。",
        en: "Could you explain this dish?",
      },
      {
        jp: "明倫学舎までの道を教えていただけますか。",
        en: "Could you tell me the way to Meirin Gakusha?",
      },
      {
        jp: "おすすめの萩焼のお店を教えていただけますか。",
        en: "Could you recommend a Hagi-ware shop?",
      },
    ],
  },
  {
    pat: "〜はありますか / 〜はどこですか",
    gloss: "Is there ~? / Where is ~?",
    note: "The workhorse for checking availability and locating things.",
    ex: [
      {
        jp: "地元の料理はありますか。",
        en: "Do you have any local dishes?",
      },
      {
        jp: "素泊まりプランはありますか。",
        en: "Do you have a room-only plan?",
      },
      {
        jp: "萩バスセンターはどこですか。",
        en: "Where is the Hagi Bus Center?",
      },
    ],
  },
];

const SOURCE = [
  {
    jp: "萩の中心地だから便利！",
    en: "It's right in the middle of Hagi, so it's handy!",
    where: "Room page",
    url: "https://takadai.co.jp/room",
    grammar: [
      {
        p: "〜だから",
        d: "Means 'because / so.' The plain copula だ (= です) + から gives a reason. Attaches to a noun: 中心地 + だ + から = 'because it is the central area.' だから is the punchy, casual version for headlines; in polite speech use 中心地ですから.",
      },
    ],
    vocab: [
      {
        w: "中心地",
        y: "ちゅうしんち",
        m: "central area, heart of town",
        lvl: "N3",
      },
      {
        w: "だから",
        y: "だから",
        m: "so, therefore, because",
        lvl: "N4",
      },
      {
        w: "便利",
        y: "べんり",
        m: "convenient, handy (na-adj)",
        lvl: "N5",
      },
    ],
  },
  {
    jp: "旅の疲れを癒す萩温泉",
    en: "the Hagi hot spring that soothes the fatigue of travel",
    where: "Spa page",
    url: "https://takadai.co.jp/spa",
    grammar: [
      {
        p: "Noun-modifying clause",
        d: "A whole verb phrase — 旅の疲れを癒す — sits in front of 萩温泉 to describe it: 'travel-fatigue-soothing Hagi onsen.' Japanese places the modifier before the noun with no relative pronoun; the verb 癒す stays in plain form right before the noun.",
      },
      {
        p: "の (linking)",
        d: "旅の疲れ = 'the fatigue of travel' — の links two nouns like 'of.'",
      },
    ],
    vocab: [
      {
        w: "旅",
        y: "たび",
        m: "travel, journey",
        lvl: "N4",
      },
      {
        w: "疲れ",
        y: "つかれ",
        m: "tiredness, fatigue",
        lvl: "N4",
      },
      {
        w: "癒す",
        y: "いやす",
        m: "to heal, to soothe",
        lvl: "N2",
      },
      {
        w: "温泉",
        y: "おんせん",
        m: "hot spring",
        lvl: "N4",
      },
    ],
  },
  {
    jp: "旬の素材を生かした、繊細な味を心ゆくまでご堪能ください。",
    en: "Please savor to your heart's content the delicate flavors that make the most of seasonal ingredients.",
    where: "Cuisine page",
    url: "https://takadai.co.jp/cuisine",
    grammar: [
      {
        p: "〜を生かした + noun",
        d: "A noun-modifying clause in the た-form: 旬の素材を生かした味 = 'flavors that have made the most of seasonal ingredients.' This た is a resultant-state descriptor, not past tense.",
      },
      {
        p: "ご〜ください",
        d: "Honorific request: ご + a sino-Japanese noun + ください = a polished 'please do ~.' ご堪能ください = 'please savor (fully),' more elevated than everyday 〜てください.",
      },
      {
        p: "心ゆくまで",
        d: "Idiom: 'to one's heart's content' (lit. 心 heart + ゆく go + まで until).",
      },
    ],
    vocab: [
      {
        w: "旬",
        y: "しゅん",
        m: "in season",
        lvl: "N2",
      },
      {
        w: "素材",
        y: "そざい",
        m: "ingredient, material",
        lvl: "N2",
      },
      {
        w: "生かす",
        y: "いかす",
        m: "to make the most of, to utilize",
        lvl: "N2",
      },
      {
        w: "繊細",
        y: "せんさい",
        m: "delicate, subtle (na-adj)",
        lvl: "N1",
      },
      {
        w: "味",
        y: "あじ",
        m: "flavor, taste",
        lvl: "N4",
      },
      {
        w: "堪能",
        y: "たんのう",
        m: "to fully enjoy / savor",
        lvl: "N1",
      },
    ],
  },
  {
    jp: "維新の故郷として多くの歴史的遺産を残す萩。",
    en: "Hagi — which, as the birthplace of the Restoration, preserves many historical legacies.",
    where: "Homepage intro",
    url: "https://takadai.co.jp/",
    grammar: [
      {
        p: "〜として",
        d: "Means 'as / in the role of.' 維新の故郷として = 'as the birthplace of the Restoration' — frames the capacity in which Hagi acts.",
      },
      {
        p: "Noun-modifying clause",
        d: "The entire phrase 維新の故郷として多くの歴史的遺産を残す modifies 萩: 'Hagi, which leaves behind many historical legacies.' Plain verb 残す sits directly before 萩.",
      },
      {
        p: "多くの + noun",
        d: "Means 'many ~,' a more written/formal equivalent of たくさんの.",
      },
    ],
    vocab: [
      {
        w: "維新",
        y: "いしん",
        m: "(Meiji) Restoration",
        lvl: "N1",
      },
      {
        w: "故郷",
        y: "ふるさと",
        m: "hometown, birthplace",
        lvl: "N3",
      },
      {
        w: "として",
        y: "として",
        m: "as, in the capacity of",
        lvl: "N3",
      },
      {
        w: "歴史的",
        y: "れきしてき",
        m: "historical (歴史 + 的 suffix)",
        lvl: "N3",
      },
      {
        w: "遺産",
        y: "いさん",
        m: "heritage, legacy",
        lvl: "N2",
      },
      {
        w: "残す",
        y: "のこす",
        m: "to leave behind, to preserve",
        lvl: "N4",
      },
    ],
  },
  {
    jp: "観光にもビジネスにもお選びいただいています。",
    en: "Guests choose us for both sightseeing and business.",
    where: "Room page",
    url: "https://takadai.co.jp/room",
    grammar: [
      {
        p: "〜にも〜にも",
        d: "Means 'for both A and B.' Repeating に + も lists two situations inclusively: 観光にもビジネスにも = 'for sightseeing and for business alike.'",
      },
      {
        p: "お〜いただく",
        d: "Humble honorific: お + verb-stem + いただく expresses that the business humbly receives the customer's action. お選びいただく = 'you kindly choose us.' With 〜ています it becomes an ongoing state. Classic service-industry keigo.",
      },
    ],
    vocab: [
      {
        w: "観光",
        y: "かんこう",
        m: "sightseeing, tourism",
        lvl: "N4",
      },
      {
        w: "ビジネス",
        y: "びじねす",
        m: "business (loanword)",
        lvl: "N5",
      },
      {
        w: "選ぶ",
        y: "えらぶ",
        m: "to choose",
        lvl: "N4",
      },
      {
        w: "いただく",
        y: "いただく",
        m: "humble 'to receive' (here an auxiliary)",
        lvl: "N3",
      },
    ],
  },
  {
    jp: "「基本は料理屋」の精神は明治11年の創業以来変わらず、地産地消のお料理をご提供しております。",
    en: "The spirit of 'fundamentally a restaurant' has not changed since our founding in Meiji 11 (1878), and we continue to serve locally sourced cuisine.",
    where: "Cuisine page",
    url: "https://takadai.co.jp/cuisine",
    grammar: [
      {
        p: "〜以来〜ず",
        d: "〜以来 means 'since ~' (a past starting point continuing to now). 変わらず is the negative conjunctive of 変わる — 'without changing.' Together: 'has not changed since founding.' This ず form is classical/literary; modern speech uses 変わらないで.",
      },
      {
        p: "ご〜しております",
        d: "The full humble form: ご + verb-stem + しております (humble progressive of する). ご提供しております = 'we humbly continue to provide.' This is the gold standard of service-industry keigo — one level more formal than ご〜しています.",
      },
    ],
    vocab: [
      {
        w: "精神",
        y: "せいしん",
        m: "spirit, ethos, philosophy",
        lvl: "N2",
      },
      {
        w: "創業",
        y: "そうぎょう",
        m: "founding (of a business)",
        lvl: "N2",
      },
      {
        w: "以来",
        y: "いらい",
        m: "since, ever since (a point in the past)",
        lvl: "N3",
      },
      {
        w: "地産地消",
        y: "ちさんちしょう",
        m: "local production for local consumption",
        lvl: "N1",
      },
      {
        w: "提供",
        y: "ていきょう",
        m: "to provide, to offer",
        lvl: "N3",
      },
    ],
  },
  {
    jp: "豊かな自然に育まれた萩の幸を存分にお楽しみくださいませ。",
    en: "Please enjoy to the full the bounty of Hagi, nurtured by its rich natural surroundings.",
    where: "Cuisine page",
    url: "https://takadai.co.jp/cuisine",
    grammar: [
      {
        p: "〜に育まれた (passive)",
        d: "育む (to nurture) in its passive form 育まれる = 'to be nurtured by.' The agent is 豊かな自然に (by rich nature). Japanese passive with に marks the cause or agent. Here it modifies 萩の幸: 'the bounty of Hagi that has been nurtured by rich nature.'",
      },
      {
        p: "お〜くださいませ",
        d: "The most elevated form of a request: お + verb-stem + くださいませ. More formal than ご〜ください, and much more so than 〜てください. The ませ ending lifts it to written/ceremony register — typical of ryokan and traditional restaurant copy.",
      },
      {
        p: "存分に",
        d: "Adverb: 'to the full extent, as much as one likes.' More formal/literary than たくさん. Often paired with お楽しみください in hospitality contexts.",
      },
    ],
    vocab: [
      {
        w: "豊か",
        y: "ゆたか",
        m: "rich, abundant (na-adj)",
        lvl: "N3",
      },
      {
        w: "育む",
        y: "はぐくむ",
        m: "to nurture, to foster",
        lvl: "N1",
      },
      {
        w: "幸",
        y: "さち",
        m: "bounty, blessing (here: seafood/produce)",
        lvl: "N2",
      },
      {
        w: "存分に",
        y: "ぞんぶんに",
        m: "to the full, as much as one likes",
        lvl: "N1",
      },
    ],
  },
  {
    jp: "竹と灯で作られた和やかな空間でお寛ぎください。",
    en: "Please relax in the serene space created with bamboo and lantern light.",
    where: "Facilities page",
    url: "https://takadai.co.jp/facilities",
    grammar: [
      {
        p: "〜で作られた + noun (passive modifier)",
        d: "作られた is the passive past of 作る (to make/create). 竹と灯で作られた空間 = 'a space that was created with bamboo and lantern light.' The で marks the material/means. Passive modifiers like this are everywhere in formal descriptive writing — learn to spot them before the noun.",
      },
      {
        p: "お〜ください",
        d: "The standard polite request: お + verb-stem + ください. お寛ぎください = 'please relax.' Verb 寛ぐ (くつろぐ) means to relax, unwind. The お prefix gives it a gentle, formal lift appropriate for hospitality.",
      },
    ],
    vocab: [
      {
        w: "竹",
        y: "たけ",
        m: "bamboo",
        lvl: "N4",
      },
      {
        w: "灯",
        y: "ともしび",
        m: "light, lantern, flame",
        lvl: "N2",
      },
      {
        w: "和やか",
        y: "なごやか",
        m: "peaceful, serene, harmonious (na-adj)",
        lvl: "N2",
      },
      {
        w: "空間",
        y: "くうかん",
        m: "space, atmosphere",
        lvl: "N3",
      },
      {
        w: "寛ぐ",
        y: "くつろぐ",
        m: "to relax, to unwind",
        lvl: "N2",
      },
    ],
  },
  {
    jp: "古くから御贔屓にしていただいている文人の書画があり、小さな美術館のようです。",
    en: "There are calligraphy works and paintings by literary figures who have long patronized us, making it feel like a small art museum.",
    where: "Facilities page",
    url: "https://takadai.co.jp/facilities",
    grammar: [
      {
        p: "御贔屓にしていただく",
        d: "御贔屓 (ごひいき) means 'patronage, favour.' 御贔屓にする = 'to patronize, to be a loyal customer of.' In the form 御贔屓にしていただいている it becomes: 'who have graciously been giving us their patronage' — the business humbly receiving the customer's ongoing loyalty. A classic expression you'll see in traditional shops.",
      },
      {
        p: "〜のようです",
        d: "Means 'it seems like / it is like ~.' A simile/inference marker. 小さな美術館のようです = 'it is like a small art museum.' Softer than 〜です alone — the inn is being modest about its own cultural richness.",
      },
    ],
    vocab: [
      {
        w: "古く",
        y: "ふるく",
        m: "long ago, for a long time (adv. use of 古い)",
        lvl: "N4",
      },
      {
        w: "御贔屓",
        y: "ごひいき",
        m: "patronage, favour, loyal custom",
        lvl: "N1",
      },
      {
        w: "文人",
        y: "ぶんじん",
        m: "literary figure, man of letters",
        lvl: "N1",
      },
      {
        w: "書画",
        y: "しょが",
        m: "calligraphy and painting",
        lvl: "N1",
      },
      {
        w: "美術館",
        y: "びじゅつかん",
        m: "art museum",
        lvl: "N4",
      },
    ],
  },
  {
    jp: "萩ならではの大広間でのお食事は、幕末～明治時代を体感できます。",
    en: "Dining in the grand banquet hall — something you can only find in Hagi — lets you feel the atmosphere of the late Edo through Meiji eras.",
    where: "Packages page",
    url: "https://takadai.co.jp/",
    grammar: [
      {
        p: "〜ならでは",
        d: "A fixed expression meaning 'only possible with / unique to ~.' 萩ならでは = 'something that could only be found in Hagi / uniquely Hagi.' It always follows a noun and implies no other place or thing could offer this. You'll see 〜ならではの + noun everywhere in regional tourism copy.",
      },
      {
        p: "〜を体感できます",
        d: "体感する = 'to experience physically, to feel in one's body' (stronger than just 感じる). With できます: 'you can physically experience ~.' This construction (noun + を + できます verb) is your standard 'you can do X here' phrasing for tourism settings.",
      },
    ],
    vocab: [
      {
        w: "ならでは",
        y: "ならでは",
        m: "unique to, only possible with (set expression)",
        lvl: "N2",
      },
      {
        w: "大広間",
        y: "おおひろま",
        m: "large banquet hall, grand room",
        lvl: "N2",
      },
      {
        w: "幕末",
        y: "ばくまつ",
        m: "end of the Edo shogunate period",
        lvl: "N1",
      },
      {
        w: "体感",
        y: "たいかん",
        m: "to feel physically, to experience firsthand",
        lvl: "N2",
      },
    ],
  },
];

const CULTURE = [
  {
    icon: Home,
    jp: "料亭・旅館の世界",
    en: "The ryotei & ryokan world",
    body: "Takadai is a 料亭 (ryōtei) — a traditional fine-dining restaurant — that also runs as an inn, founded in 1878. In the countryside, longevity is the brand: expect a founding year on the sign (創業), the word 老舗 for a long-established house, framed calligraphy from a famous past guest, and a strong sense of おもてなし (hospitality).",
    terms: ["料亭", "旅館", "老舗", "お土産", "宿"],
  },
  {
    icon: Utensils,
    jp: "地産地消の食",
    en: "Local land & sea on the plate",
    body: "The kitchen leans on 地産地消 — sourcing from the immediate region. Look for 見蘭牛 (Kenran beef), Hagi's marbled brand beef, and Sea-of-Japan seafood: お刺身, 鯛のあら炊き (simmered sea-bream collar), and 串揚げ. Meals are usually 夕朝食付き; the budget option is 素泊まり.",
    terms: ["見蘭牛", "刺身", "串揚げ", "素泊まり", "旬"],
  },
  {
    icon: Home,
    jp: "温泉のマナー",
    en: "Onsen etiquette",
    body: "Takadai opened はぎ温泉 in 2008, with a 大浴場 (large bath) and a free 貸切風呂 (private bath). Wash and rinse fully before entering the shared tub — no swimwear, small towel never touches the water. Tattoos? Ask first, or just book the 貸切風呂.",
    terms: ["温泉", "大浴場", "貸切風呂", "和室"],
  },
  {
    icon: Landmark,
    jp: "維新のふるさと",
    en: "Birthplace of modern Japan",
    body: "Hagi was the 城下町 of the Chōshū domain and the launch pad for the 明治維新. Because the capital moved away in 1863, the Edo-era streets survived intact; several sites became 世界遺産 in 2015. Look for 松下村塾, the 萩城跡 castle ruins, and the prized 萩焼 pottery — a classic souvenir.",
    terms: ["城下町", "維新", "世界遺産", "萩焼", "歴史"],
  },
];

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

/* ── Helpers ─────────────────────────────────────────────────────── */
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

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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

/* ── VocabPill: chip + hover popover ─────────────────────────────── */
function VocabPill({
  term,
}) {
  const showFuri = useFurigana();
  const entry = VOCAB_MAP[term];
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState("above");
  const triggerRef = useRef(null);
  const timerRef = useRef(null);

  const recalcPos = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos(rect.top < 130 ? "below" : "above");
  }, []);

  const show = () => { clearTimeout(timerRef.current); recalcPos(); setOpen(true); };
  const hide = () => { timerRef.current = setTimeout(() => setOpen(false), 120); };
  const stay = () => clearTimeout(timerRef.current);

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (!triggerRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  if (!entry) {
    return (
      <button
        className="hg-chip"
        onClick={() => speak(term)}
        title="Tap to hear"
      >{term}
      </button>
    );
  }

  const chipLabel = showFuri && entry.yomi
    ? (
      <ruby>
        {term}
        <rt className="hg-rt">{entry.yomi}</rt>
      </ruby>
    )
    : term;

  return (
    <span className="hg-pill-wrap">
      <button
        ref={triggerRef}
        className="hg-chip"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={() => speak(term)}
        aria-describedby={open ? `pop-${term}` : undefined}
      >
        {chipLabel}
      </button>
      {open && (
        <span
          id={`pop-${term}`}
          role="tooltip"
          className="hg-popover"
          data-pos={pos}
          onMouseEnter={stay}
          onMouseLeave={hide}
        >
          <span className="hg-pop-jp">
            {showFuri && entry.yomi
              ? (
                <ruby>
                  {term}
                  <rt className="hg-rt pop">{entry.yomi}</rt>
                </ruby>
              )
              : term}
          </span>
          {!showFuri && entry.yomi && <span className="hg-pop-yomi">{entry.yomi}</span>}
          <span className="hg-pop-en">{entry.en}</span>
          <LevelBadge lvl={entry.lvl} />
        </span>
      )}
    </span>
  );
}

/* ── App ─────────────────────────────────────────────────────────── */
export default function App() {
  const [tab, setTab] = useState("culture");
  const [furigana, setFurigana] = useState(true);

  return (
    <FuriganaCtx.Provider value={furigana}>
      <div className="hg-root">
        <style>{CSS}</style>

        <header className="hg-header">
          <div className="hg-header-inner">
            <div
              className="hg-scroll"
              aria-hidden="true"
            >萩の御厨　高大
            </div>
            <div className="hg-title-block">
              <div className="hg-eyebrow">A Japanese Lesson for Western Rural Japan</div>
              <h1 className="hg-title">
                萩
                <span className="hg-dot" />
                への旅
              </h1>
              <div className="hg-sub">Hagi, Yamaguchi · vocabulary, grammar & culture from a 145-year-old ryotei inn</div>
            </div>
            <button
              className="hg-furi-toggle"
              onClick={() => setFurigana(f => !f)}
              aria-pressed={furigana}
              title={furigana ? "Hide furigana" : "Show furigana"}
            >
              <span className="hg-furi-kanji">
                {furigana
                  ? (
                    <ruby>
                      あ
                      <rt className="hg-furi-rt">ふりがな</rt>
                    </ruby>
                  )
                  : "あ"}
              </span>
              <span className="hg-furi-label">{furigana ? "ふりがな ON" : "ふりがな OFF"}</span>
            </button>
          </div>

          <nav
            className="hg-tabs"
            role="tablist"
            aria-label="Lesson sections"
          >
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={tab === t.id}
                  className="hg-tab"
                  data-active={tab === t.id}
                  onClick={() => setTab(t.id)}
                >
                  <Icon
                    size={16}
                    strokeWidth={2.2}
                  />
                  <span className="hg-tab-jp">{t.jp}</span>
                  <span className="hg-tab-en">{t.en}</span>
                </button>
              );
            })}
          </nav>
        </header>

        <main className="hg-main">
          {tab === "culture" && <Culture />}
          {tab === "vocab" && <Vocab />}
          {tab === "grammar" && <Grammar />}
          {tab === "source" && <SourceSentences />}
          {tab === "practice" && <Practice />}
        </main>

        <footer className="hg-footer">
          Study aid built from
          {" "}
          <a
            href="https://takadai.co.jp/"
            target="_blank"
            rel="noreferrer"
          >takadai.co.jp
          </a>
          .
          Target level N4 — JLPT badge marks words above it.
        </footer>
      </div>
    </FuriganaCtx.Provider>
  );
}

/* ── Culture ─────────────────────────────────────────────────────── */
function Culture() {
  return (
    <section className="hg-pane">
      <p className="hg-lede">
        One historic inn opens a window onto a whole style of travel. Learn the words for
        <strong> 高大 (Takadai)</strong>
        {" "}
        and you learn the words for the ryotei, the onsen, the
        local table, and the castle town that helped launch modern Japan.
        <span className="hg-lede-tip">Hover a term chip to see its definition.</span>
      </p>
      <div className="hg-culture-grid">
        {CULTURE.map((c) => {
          const Icon = c.icon;
          return (
            <article
              className="hg-culture-card"
              key={c.en}
            >
              <div className="hg-culture-head">
                <span className="hg-culture-icon">
                  <Icon
                    size={18}
                    strokeWidth={2.2}
                  />
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

/* ── Vocab ───────────────────────────────────────────────────────── */
function Vocab() {
  const [cat, setCat] = useState("all");
  const [flipped, setFlipped] = useState(() => new Set());
  const list = useMemo(() => cat === "all" ? VOCAB : VOCAB.filter(v => v.cat === cat), [cat]);
  const toggle = key => setFlipped((prev) => {
    const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n;
  });
  return (
    <section className="hg-pane">
      <div className="hg-toolbar">
        <div className="hg-catrow">
          {Object.entries(CATS).map(([id, c]) => {
            const Icon = c.icon;
            return (
              <button
                key={id}
                className="hg-catbtn"
                data-active={cat === id}
                onClick={() => { setCat(id); setFlipped(new Set()); }}
              >
                <Icon
                  size={14}
                  strokeWidth={2.2}
                />
                {c.en}
              </button>
            );
          })}
        </div>
      </div>
      <p className="hg-hint">Tap to flip. Furigana follows the global toggle in the header.</p>
      <div className="hg-cardgrid">
        {list.map((v) => {
          const isFlipped = flipped.has(v.jp);
          return (
            <div
              key={v.jp}
              className="hg-flip"
              data-flipped={isFlipped}
              onClick={() => toggle(v.jp)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(v.jp); } }}
            >
              <div className="hg-flip-inner">
                <div className="hg-face hg-front">
                  <span className="hg-face-cat">{CATS[v.cat].en}</span>
                  <div className="hg-vocab-jp">
                    <Furi
                      kanji={v.jp}
                      yomi={v.yomi}
                    />
                  </div>
                  <LevelBadge lvl={v.lvl} />
                </div>
                <div className="hg-face hg-back">
                  <div className="hg-vocab-yomi-back">{v.yomi}</div>
                  <div className="hg-vocab-en">{v.en}</div>
                  <button
                    className="hg-speak"
                    onClick={(e) => { e.stopPropagation(); speak(v.jp); }}
                    aria-label={"Hear " + v.jp}
                  >
                    <Volume2 size={16} />
                  </button>
                  <LevelBadge lvl={v.lvl} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ── Grammar ─────────────────────────────────────────────────────── */
function Grammar() {
  const [open, setOpen] = useState(0);
  const [revealed, setRevealed] = useState(() => new Set());
  const toggleEx = id => setRevealed((prev) => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  return (
    <section className="hg-pane">
      <p className="hg-hint">Four patterns for booking, ordering, permission, and directions. Tap a sentence to reveal its translation.</p>
      <div className="hg-accordion">
        {GRAMMAR.map((g, gi) => {
          const isOpen = open === gi;
          return (
            <div
              className="hg-acc-item"
              key={g.pat}
              data-open={isOpen}
            >
              <button
                className="hg-acc-head"
                onClick={() => setOpen(isOpen ? -1 : gi)}
              >
                <span className="hg-acc-num">{String(gi + 1).padStart(2, "0")}</span>
                <span className="hg-acc-titles">
                  <span className="hg-acc-pat">{g.pat}</span>
                  <span className="hg-acc-gloss">{g.gloss}</span>
                </span>
                <ChevronDown
                  className="hg-acc-chev"
                  size={20}
                />
              </button>
              {isOpen && (
                <div className="hg-acc-body">
                  <p className="hg-acc-note">{g.note}</p>
                  <ul className="hg-exlist">
                    {g.ex.map((e, ei) => {
                      const id = `${gi}-${ei}`;
                      const show = revealed.has(id);
                      return (
                        <li
                          key={id}
                          className="hg-ex"
                        >
                          <div className="hg-ex-jp-row">
                            <button
                              className="hg-ex-speak"
                              onClick={() => speak(e.jp)}
                              aria-label="Hear"
                            >
                              <Volume2 size={15} />
                            </button>
                            <button
                              className="hg-ex-jp"
                              onClick={() => toggleEx(id)}
                            >{e.jp}
                            </button>
                          </div>
                          <div
                            className="hg-ex-en"
                            data-show={show}
                            onClick={() => toggleEx(id)}
                          >
                            {show ? e.en : "Tap to reveal translation"}
                          </div>
                        </li>
                      );
                    })}
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

/* ── Source sentences ────────────────────────────────────────────── */
function SourceSentences() {
  const [shownEn, setShownEn] = useState(() => new Set());
  const [shownBreak, setShownBreak] = useState(() => new Set());
  const toggle = setter => i => setter((prev) => {
    const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n;
  });
  const toggleEn = toggle(setShownEn);
  const toggleBreak = toggle(setShownBreak);
  return (
    <section className="hg-pane">
      <p className="hg-lede">
        Five lines lifted straight from
        {" "}
        <strong>takadai.co.jp</strong>
        . Read aloud, guess the meaning,
        then reveal the translation and unpack how it's built.
      </p>
      <div className="hg-src-list">
        {SOURCE.map((s, i) => {
          const enOpen = shownEn.has(i);
          const brkOpen = shownBreak.has(i);
          return (
            <article
              className="hg-src-card"
              key={i}
            >
              <div className="hg-src-top">
                <span className="hg-src-where">
                  <ScrollText
                    size={13}
                    strokeWidth={2.2}
                  />
                  {" "}
                  {s.where}
                </span>
                <a
                  className="hg-src-link"
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  source
                  <ExternalLink size={12} />
                </a>
              </div>
              <div className="hg-src-jp-row">
                <button
                  className="hg-ex-speak"
                  onClick={() => speak(s.jp)}
                  aria-label="Hear"
                >
                  <Volume2 size={15} />
                </button>
                <p className="hg-src-jp">{s.jp}</p>
              </div>
              <button
                className="hg-src-reveal"
                data-open={enOpen}
                onClick={() => toggleEn(i)}
              >
                {enOpen ? s.en : "Reveal translation"}
              </button>
              <button
                className="hg-src-breaktoggle"
                onClick={() => toggleBreak(i)}
              >
                <Layers size={14} />
                {brkOpen ? "Hide breakdown" : "Break it down"}
                <ChevronDown
                  size={15}
                  className="hg-src-chev"
                  data-open={brkOpen}
                />
              </button>
              {brkOpen && (
                <div className="hg-src-break">
                  <div className="hg-src-section">
                    <h4 className="hg-src-h">Grammar</h4>
                    <ul className="hg-src-glist">
                      {s.grammar.map((g, gi) => (
                        <li key={gi}>
                          <span className="hg-src-gpat">{g.p}</span>
                          <span className="hg-src-gdesc">{g.d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="hg-src-section">
                    <h4 className="hg-src-h">Vocabulary</h4>
                    <ul className="hg-src-vlist">
                      {s.vocab.map((v, vi) => (
                        <li key={vi}>
                          <span className="hg-src-vw">
                            <Furi
                              kanji={v.w}
                              yomi={v.y}
                            />
                          </span>
                          <span className="hg-src-vy">{v.y}</span>
                          <span className="hg-src-vm">{v.m}</span>
                          <LevelBadge lvl={v.lvl} />
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

/* ── Practice ────────────────────────────────────────────────────── */
function Practice() {
  const [dir, setDir] = useState("jp2en");
  const [cat, setCat] = useState("all");
  const [deck, setDeck] = useState(null);
  const [idx, setIdx] = useState(0);
  const [reveal, setReveal] = useState(false);
  const [known, setKnown] = useState([]);
  const [review, setReview] = useState([]);
  const pool = cat === "all" ? VOCAB : VOCAB.filter(v => v.cat === cat);
  const start = (cards) => { setDeck(shuffle(cards)); setIdx(0); setReveal(false); setKnown([]); setReview([]); };
  const mark = (good) => {
    const card = deck[idx];
    if (good) setKnown(k => [...k, card]); else setReview(r => [...r, card]);
    if (idx + 1 < deck.length) { setIdx(idx + 1); setReveal(false); }
    else setIdx(idx + 1);
  };

  if (!deck) return (
    <section className="hg-pane hg-practice-setup">
      <div className="hg-setup-card">
        <h2 className="hg-setup-title">
          練習
          <span>Flashcard drill</span>
        </h2>
        <p className="hg-setup-lede">Self-graded recall. Say the answer aloud, then check yourself.</p>
        <div className="hg-setup-row">
          <span className="hg-setup-label">Prompt with</span>
          <div className="hg-seg">
            <button
              data-active={dir === "jp2en"}
              onClick={() => setDir("jp2en")}
            >日本語 → EN
            </button>
            <button
              data-active={dir === "en2jp"}
              onClick={() => setDir("en2jp")}
            >EN → 日本語
            </button>
          </div>
        </div>
        <div className="hg-setup-row">
          <span className="hg-setup-label">Deck</span>
          <div className="hg-seg wrap">
            {Object.entries(CATS).map(([id, c]) => (
              <button
                key={id}
                data-active={cat === id}
                onClick={() => setCat(id)}
              >{c.en}
              </button>
            ))}
          </div>
        </div>
        <button
          className="hg-primary"
          onClick={() => start(pool)}
        >
          Start ·
          {" "}
          {pool.length}
          {" "}
          cards
          {" "}
          <ArrowRight size={17} />
        </button>
      </div>
    </section>
  );

  if (idx >= deck.length) {
    const pct = Math.round((known.length / deck.length) * 100);
    return (
      <section className="hg-pane hg-practice-setup">
        <div className="hg-setup-card hg-result">
          <div
            className="hg-result-ring"
            style={{
              "--pct": pct,
            }}
          >
            <span>{pct}%</span>
          </div>
          <h2 className="hg-setup-title">
            お疲れさま
            <span>Nice work</span>
          </h2>
          <p className="hg-result-line">
            <strong>{known.length}</strong>
            {" "}
            known ·
            {" "}
            <strong>{review.length}</strong>
            {" "}
            to review
          </p>
          <div className="hg-result-btns">
            {review.length > 0 && (
              <button
                className="hg-primary"
                onClick={() => start(review)}
              >
                <RotateCcw size={16} />
                {" "}
                Review the
                {" "}
                {review.length}
                {" "}
                missed
              </button>
            )}
            <button
              className="hg-ghost big"
              onClick={() => start(pool)}
            >
              <RefreshCw size={16} />
              {" "}
              Restart full deck
            </button>
            <button
              className="hg-ghost big"
              onClick={() => setDeck(null)}
            >Change settings
            </button>
          </div>
        </div>
      </section>
    );
  }

  const card = deck[idx];
  const progress = Math.round((idx / deck.length) * 100);
  return (
    <section className="hg-pane hg-practice-live">
      <div className="hg-prog">
        <div
          className="hg-prog-bar"
          style={{
            width: progress + "%",
          }}
        />
      </div>
      <div className="hg-prog-meta">
        <span>{idx + 1} / {deck.length}</span>
        <button
          className="hg-mini"
          onClick={() => setDeck(null)}
        >Quit
        </button>
      </div>
      <div className="hg-quizcard">
        <span className="hg-face-cat">{CATS[card.cat].en}</span>
        <div className={dir === "jp2en" ? "hg-quiz-jp" : "hg-quiz-en"}>
          {dir === "jp2en"
            ? (
              <Furi
                kanji={card.jp}
                yomi={card.yomi}
              />
            )
            : card.en}
        </div>
        {dir === "jp2en" && (
          <button
            className="hg-speak inline"
            onClick={() => speak(card.jp)}
            aria-label="Hear"
          >
            <Volume2 size={16} />
          </button>
        )}
        {reveal
          ? (
            <div className="hg-quiz-answer">
              <div className={dir === "jp2en" ? "hg-quiz-en answer" : "hg-quiz-jp answer"}>
                {dir === "en2jp"
                  ? (
                    <Furi
                      kanji={card.jp}
                      yomi={card.yomi}
                    />
                  )
                  : card.en}
              </div>
              <div className="hg-quiz-yomi">{card.yomi}</div>
              <LevelBadge lvl={card.lvl} />
            </div>
          )
          : (
            <button
              className="hg-reveal"
              onClick={() => setReveal(true)}
            >Show answer
            </button>
          )}
      </div>
      {reveal && (
        <div className="hg-grade">
          <button
            className="hg-grade-btn review"
            onClick={() => mark(false)}
          >
            <RotateCcw size={16} />
            {" "}
            Review again
          </button>
          <button
            className="hg-grade-btn good"
            onClick={() => mark(true)}
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

/* ── CSS ─────────────────────────────────────────────────────────── */
const CSS = `
:root{
  --indigo:#153843;--indigo2:#1F4E5A;--indigo-ink:#0E2830;
  --plaster:#F3ECDD;--plaster2:#EAE0CC;--card:#FBF7EE;
  --citrus:#E8912D;--citrus-deep:#C9741A;--citrus-soft:#F6D8A8;
  --sumi:#242019;--stone:#7C7A6C;--glaze:#E6D6C4;
  --line:rgba(36,32,25,.13);--line2:rgba(36,32,25,.08);
  --jp-serif:"Hiragino Mincho ProN","Yu Mincho","YuMincho","Noto Serif JP",serif;
  --jp-sans:"Hiragino Kaku Gothic ProN","Yu Gothic","Meiryo","Noto Sans JP",sans-serif;
  --en-serif:"Iowan Old Style","Palatino Linotype","Georgia",serif;
  --en-sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
}
*{box-sizing:border-box;}
.hg-root{background:var(--plaster);color:var(--sumi);font-family:var(--en-sans);min-height:100vh;line-height:1.5;-webkit-font-smoothing:antialiased;}
a{color:var(--citrus-deep);}
button{font-family:inherit;cursor:pointer;}

/* Furigana */
.hg-rt{font-family:var(--jp-sans);font-size:.52em;font-weight:400;color:var(--stone);letter-spacing:.04em;user-select:none;}
.hg-rt.pop{color:var(--citrus-soft);font-size:.58em;}
.hg-furi-rt{font-size:8px;color:var(--citrus-soft);}

/* Header */
.hg-header{background:var(--indigo);color:var(--plaster);position:relative;overflow:hidden;}
.hg-header::after{content:"";position:absolute;right:-70px;top:-70px;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle at 35% 35%,var(--citrus),var(--citrus-deep));opacity:.9;box-shadow:0 0 60px rgba(232,145,45,.35);}
.hg-header-inner{max-width:1080px;margin:0 auto;padding:28px 24px 20px;position:relative;z-index:2;display:flex;align-items:flex-start;gap:20px;}
.hg-scroll{writing-mode:vertical-rl;font-family:var(--jp-serif);font-size:15px;letter-spacing:.28em;color:var(--citrus-soft);opacity:.85;padding-top:4px;border-right:1px solid rgba(246,216,168,.3);padding-right:12px;min-height:110px;flex:none;}
.hg-title-block{flex:1;min-width:0;}
.hg-eyebrow{font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--citrus-soft);font-weight:600;margin-bottom:6px;}
.hg-title{font-family:var(--jp-serif);font-size:52px;line-height:1;margin:0;font-weight:600;color:#fff;display:flex;align-items:center;}
.hg-dot{display:inline-block;width:12px;height:12px;border-radius:50%;background:var(--citrus);margin:0 2px 12px 4px;align-self:flex-end;box-shadow:0 0 0 4px rgba(232,145,45,.22);}
.hg-sub{margin-top:10px;font-size:13px;color:rgba(243,236,221,.75);max-width:44ch;}

/* Furigana toggle */
.hg-furi-toggle{flex:none;align-self:flex-start;display:flex;flex-direction:column;align-items:center;gap:4px;
  padding:9px 13px;background:rgba(255,255,255,.08);border:1px solid rgba(246,216,168,.22);border-radius:10px;
  color:var(--plaster);transition:.18s;position:relative;z-index:2;}
.hg-furi-toggle:hover{background:rgba(255,255,255,.14);border-color:var(--citrus-soft);}
.hg-furi-toggle[aria-pressed="true"]{border-color:var(--citrus);background:rgba(232,145,45,.2);}
.hg-furi-kanji{font-family:var(--jp-serif);font-size:22px;line-height:1.25;display:block;text-align:center;}
.hg-furi-label{font-family:var(--jp-sans);font-size:9px;letter-spacing:.05em;color:rgba(243,236,221,.6);white-space:nowrap;}

/* Tabs */
.hg-tabs{max-width:1080px;margin:0 auto;padding:0 16px;display:flex;gap:2px;position:relative;z-index:2;overflow-x:auto;}
.hg-tab{background:transparent;border:none;color:rgba(243,236,221,.6);padding:11px 15px 13px;display:flex;align-items:center;gap:7px;border-bottom:2.5px solid transparent;white-space:nowrap;transition:color .18s;font-size:13px;}
.hg-tab-jp{font-family:var(--jp-sans);font-weight:700;}
.hg-tab-en{opacity:.75;font-size:12px;}
.hg-tab:hover{color:var(--plaster);}
.hg-tab[data-active="true"]{color:#fff;border-color:var(--citrus);}

/* Main */
.hg-main{max-width:1080px;margin:0 auto;padding:26px 24px 10px;}
.hg-pane{animation:fade .32s ease;}
@keyframes fade{from{opacity:0;transform:translateY(5px);}to{opacity:1;transform:none;}}
.hg-lede{font-family:var(--en-serif);font-size:18px;line-height:1.55;max-width:60ch;margin:0 0 24px;}
.hg-lede strong{color:var(--citrus-deep);}
.hg-lede-tip{display:block;font-family:var(--en-sans);font-size:12.5px;color:var(--stone);margin-top:6px;}
.hg-hint{font-size:13px;color:var(--stone);margin:0 0 16px;}

/* Culture */
.hg-culture-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:16px;}
.hg-culture-card{background:var(--card);border:1px solid var(--line);border-radius:4px;border-left:3px solid var(--citrus);padding:18px 20px;}
.hg-culture-head{display:flex;gap:12px;align-items:center;margin-bottom:11px;}
.hg-culture-icon{width:36px;height:36px;border-radius:50%;background:var(--indigo);color:var(--citrus-soft);display:grid;place-items:center;flex:none;}
.hg-culture-jp{font-family:var(--jp-serif);font-size:19px;margin:0;font-weight:600;}
.hg-culture-en{font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--stone);}
.hg-culture-body{font-size:14px;line-height:1.62;margin:0 0 13px;color:#33302a;}
.hg-chips{display:flex;flex-wrap:wrap;gap:7px;}

/* VocabPill */
.hg-pill-wrap{position:relative;display:inline-block;}
.hg-chip{font-family:var(--jp-sans);font-size:13px;background:var(--plaster2);border:1px solid var(--line);
  border-radius:999px;padding:3px 12px 4px;color:var(--sumi);transition:.15s;line-height:1.9;cursor:pointer;}
.hg-chip:hover,.hg-chip:focus-visible{background:var(--citrus);border-color:var(--citrus);color:#fff;outline:none;}
.hg-chip:hover .hg-rt,.hg-chip:focus-visible .hg-rt{color:rgba(255,255,255,.8);}

/* Popover */
.hg-popover{position:absolute;left:50%;transform:translateX(-50%);
  background:var(--indigo-ink);color:var(--plaster);
  border-radius:8px;padding:10px 13px 9px;
  min-width:140px;max-width:210px;width:max-content;
  box-shadow:0 8px 24px rgba(14,40,48,.4),0 2px 6px rgba(0,0,0,.2);
  z-index:999;display:flex;flex-direction:column;gap:3px;
  animation:popIn .14s ease;}
@keyframes popIn{from{opacity:0;transform:translateX(-50%) scale(.93);}to{opacity:1;transform:translateX(-50%) scale(1);}}
.hg-popover[data-pos="above"]{bottom:calc(100% + 9px);}
.hg-popover[data-pos="below"]{top:calc(100% + 9px);}
.hg-popover[data-pos="above"]::after{content:"";position:absolute;bottom:-5px;left:50%;transform:translateX(-50%);
  border:5px solid transparent;border-top-color:var(--indigo-ink);border-bottom:none;}
.hg-popover[data-pos="below"]::after{content:"";position:absolute;top:-5px;left:50%;transform:translateX(-50%);
  border:5px solid transparent;border-bottom-color:var(--indigo-ink);border-top:none;}
.hg-pop-jp{font-family:var(--jp-serif);font-size:20px;font-weight:600;line-height:1.3;}
.hg-pop-yomi{font-family:var(--jp-sans);font-size:11.5px;color:rgba(243,236,221,.55);}
.hg-pop-en{font-size:12.5px;color:rgba(243,236,221,.88);line-height:1.35;}
.hg-popover .hg-badge{align-self:flex-start;margin-top:3px;background:rgba(255,255,255,.1);color:var(--citrus-soft);}
.hg-popover .hg-badge[data-jlpt="yes"]{background:var(--citrus);color:#fff;}

/* Vocab flip cards */
.hg-toolbar{margin-bottom:6px;}
.hg-catrow{display:flex;gap:6px;flex-wrap:wrap;}
.hg-catbtn{display:flex;align-items:center;gap:6px;font-size:12.5px;padding:7px 13px;border-radius:999px;
  border:1px solid var(--line);background:var(--card);color:var(--sumi);transition:.15s;}
.hg-catbtn[data-active="true"]{background:var(--indigo);border-color:var(--indigo);color:#fff;}
.hg-ghost{display:flex;align-items:center;gap:7px;font-size:12.5px;padding:7px 13px;border-radius:999px;
  border:1px solid var(--line);background:transparent;color:var(--sumi);}
.hg-ghost:hover{border-color:var(--citrus);color:var(--citrus-deep);}
.hg-ghost.big{padding:11px 18px;font-size:14px;}
.hg-cardgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:12px;margin-top:14px;}
.hg-flip{height:162px;perspective:1000px;outline:none;}
.hg-flip:focus-visible .hg-flip-inner{box-shadow:0 0 0 2.5px var(--citrus);border-radius:6px;}
.hg-flip-inner{position:relative;width:100%;height:100%;transition:transform .5s;transform-style:preserve-3d;}
.hg-flip[data-flipped="true"] .hg-flip-inner{transform:rotateY(180deg);}
.hg-face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;
  border-radius:6px;border:1px solid var(--line);padding:14px;display:flex;flex-direction:column;
  align-items:center;justify-content:center;text-align:center;}
.hg-front{background:var(--card);}
.hg-back{background:var(--indigo);color:var(--plaster);transform:rotateY(180deg);}
.hg-face-cat{position:absolute;top:8px;left:10px;font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--stone);}
.hg-back .hg-face-cat{color:rgba(243,236,221,.45);}
.hg-vocab-jp{font-family:var(--jp-serif);font-size:26px;font-weight:600;line-height:1.5;text-align:center;}
.hg-vocab-yomi-back{font-family:var(--jp-sans);color:var(--citrus-soft);font-size:15px;margin-bottom:5px;}
.hg-vocab-en{font-size:14px;line-height:1.35;font-weight:500;padding:0 4px;}
.hg-badge{font-size:9.5px;font-weight:700;letter-spacing:.03em;padding:2px 6px;border-radius:4px;background:var(--plaster2);color:var(--stone);}
.hg-face .hg-badge{position:absolute;bottom:8px;right:9px;}
.hg-face .hg-badge[data-jlpt="yes"]{background:var(--citrus);color:#fff;}
.hg-back .hg-badge{background:rgba(246,216,168,.15);color:var(--citrus-soft);}
.hg-back .hg-badge[data-jlpt="yes"]{background:var(--citrus);color:#fff;}
.hg-speak{position:absolute;bottom:7px;left:8px;background:rgba(246,216,168,.12);border:none;color:var(--citrus-soft);
  width:28px;height:28px;border-radius:50%;display:grid;place-items:center;}
.hg-speak:hover{background:var(--citrus);color:#fff;}
.hg-speak.inline{position:static;margin:8px auto 0;background:var(--plaster2);color:var(--citrus-deep);border:none;}

/* Grammar accordion */
.hg-accordion{display:flex;flex-direction:column;gap:10px;}
.hg-acc-item{background:var(--card);border:1px solid var(--line);border-radius:5px;overflow:hidden;}
.hg-acc-item[data-open="true"]{border-color:var(--citrus);}
.hg-acc-head{width:100%;background:transparent;border:none;display:flex;align-items:center;gap:14px;padding:15px 17px;text-align:left;}
.hg-acc-num{font-family:var(--en-serif);font-size:15px;color:var(--citrus-deep);font-weight:600;width:24px;flex:none;}
.hg-acc-titles{display:flex;flex-direction:column;flex:1;}
.hg-acc-pat{font-family:var(--jp-serif);font-size:19px;font-weight:600;}
.hg-acc-gloss{font-size:12px;color:var(--stone);margin-top:2px;}
.hg-acc-chev{color:var(--stone);transition:transform .25s;flex:none;}
.hg-acc-item[data-open="true"] .hg-acc-chev{transform:rotate(180deg);color:var(--citrus);}
.hg-acc-body{padding:2px 17px 18px 55px;}
.hg-acc-note{font-size:13.5px;line-height:1.6;color:#3a362f;margin:0 0 14px;max-width:64ch;}
.hg-exlist{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:11px;}
.hg-ex{border-left:2px solid var(--glaze);padding-left:13px;}
.hg-ex-jp-row{display:flex;align-items:flex-start;gap:8px;}
.hg-ex-speak{background:var(--plaster2);border:none;color:var(--citrus-deep);width:26px;height:26px;
  border-radius:50%;display:grid;place-items:center;flex:none;margin-top:2px;}
.hg-ex-speak:hover{background:var(--citrus);color:#fff;}
.hg-ex-jp{background:none;border:none;font-family:var(--jp-serif);font-size:17px;line-height:1.5;text-align:left;color:var(--sumi);padding:0;}
.hg-ex-en{font-size:13px;color:var(--stone);margin-top:4px;padding-left:34px;cursor:pointer;font-style:italic;}
.hg-ex-en[data-show="true"]{color:#3a362f;font-style:normal;}

/* Source sentences */
.hg-src-list{display:flex;flex-direction:column;gap:15px;}
.hg-src-card{background:var(--card);border:1px solid var(--line);border-radius:6px;border-top:3px solid var(--indigo);padding:15px 19px 17px;}
.hg-src-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:11px;}
.hg-src-where{display:inline-flex;align-items:center;gap:6px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--stone);font-weight:600;}
.hg-src-link{display:inline-flex;align-items:center;gap:4px;font-size:11.5px;color:var(--citrus-deep);text-decoration:none;}
.hg-src-link:hover{text-decoration:underline;}
.hg-src-jp-row{display:flex;align-items:flex-start;gap:10px;}
.hg-src-jp{font-family:var(--jp-serif);font-size:22px;line-height:1.55;margin:0;color:var(--sumi);font-weight:500;}
.hg-src-reveal{display:block;width:100%;text-align:left;margin-top:13px;background:var(--plaster2);
  border:1px dashed var(--line);border-radius:5px;padding:10px 13px;font-family:var(--en-serif);
  font-size:15px;color:var(--stone);font-style:italic;transition:.15s;}
.hg-src-reveal[data-open="true"]{background:transparent;border-style:solid;border-color:var(--citrus-soft);color:#33302a;font-style:normal;}
.hg-src-breaktoggle{display:inline-flex;align-items:center;gap:7px;margin-top:11px;background:none;border:none;
  color:var(--indigo2);font-size:13px;font-weight:600;padding:2px 0;}
.hg-src-breaktoggle:hover{color:var(--citrus-deep);}
.hg-src-chev{transition:transform .25s;}
.hg-src-chev[data-open="true"]{transform:rotate(180deg);}
.hg-src-break{margin-top:13px;padding-top:14px;border-top:1px solid var(--line2);display:grid;grid-template-columns:1fr 1fr;gap:20px;}
.hg-src-section{min-width:0;}
.hg-src-h{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--citrus-deep);margin:0 0 9px;font-weight:700;}
.hg-src-glist{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:11px;}
.hg-src-glist li{display:flex;flex-direction:column;gap:3px;}
.hg-src-gpat{font-family:var(--jp-sans);font-size:13.5px;font-weight:700;color:var(--sumi);}
.hg-src-gdesc{font-size:12.5px;line-height:1.55;color:#3a362f;}
.hg-src-vlist{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;}
.hg-src-vlist li{display:grid;grid-template-columns:auto 1fr;grid-template-areas:"w y" "m m";gap:2px 9px;align-items:baseline;position:relative;padding-right:40px;padding-bottom:8px;border-bottom:1px solid var(--line2);}
.hg-src-vlist li:last-child{border-bottom:none;padding-bottom:0;}
.hg-src-vw{grid-area:w;font-family:var(--jp-serif);font-size:16px;font-weight:600;}
.hg-src-vy{grid-area:y;font-family:var(--jp-sans);font-size:11.5px;color:var(--stone);}
.hg-src-vm{grid-area:m;font-size:12.5px;color:#3a362f;line-height:1.4;}
.hg-src-vlist .hg-badge{position:absolute;top:0;right:0;}

/* Practice */
.hg-practice-setup{display:flex;justify-content:center;padding-top:8px;}
.hg-setup-card{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:28px 28px 32px;max-width:440px;width:100%;text-align:center;}
.hg-setup-title{font-family:var(--jp-serif);font-size:27px;margin:0 0 6px;font-weight:600;}
.hg-setup-title span{font-family:var(--en-serif);font-size:15px;color:var(--stone);font-weight:400;margin-left:8px;}
.hg-setup-lede{font-size:14px;color:#3a362f;margin:0 0 22px;}
.hg-setup-row{display:flex;flex-direction:column;gap:8px;align-items:center;margin-bottom:16px;}
.hg-setup-label{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--stone);font-weight:600;}
.hg-seg{display:inline-flex;background:var(--plaster2);border-radius:999px;padding:3px;gap:3px;}
.hg-seg.wrap{flex-wrap:wrap;justify-content:center;border-radius:14px;}
.hg-seg button{border:none;background:transparent;padding:7px 13px;border-radius:999px;font-size:13px;color:var(--sumi);}
.hg-seg button[data-active="true"]{background:var(--indigo);color:#fff;}
.hg-primary{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:var(--citrus);
  color:#fff;border:none;border-radius:999px;padding:12px 24px;font-size:15px;font-weight:600;margin-top:8px;
  box-shadow:0 5px 16px rgba(232,145,45,.28);transition:.15s;}
.hg-primary:hover{background:var(--citrus-deep);}
.hg-practice-live{max-width:540px;margin:0 auto;}
.hg-prog{height:5px;background:var(--plaster2);border-radius:999px;overflow:hidden;}
.hg-prog-bar{height:100%;background:var(--citrus);transition:width .3s;}
.hg-prog-meta{display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--stone);margin:7px 2px 18px;}
.hg-mini{background:none;border:none;color:var(--stone);font-size:12px;text-decoration:underline;}
.hg-quizcard{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:40px 24px;
  text-align:center;min-height:220px;display:flex;flex-direction:column;align-items:center;justify-content:center;}
.hg-quiz-jp{font-family:var(--jp-serif);font-size:38px;font-weight:600;line-height:1.6;}
.hg-quiz-en{font-family:var(--en-serif);font-size:23px;line-height:1.35;padding:0 10px;}
.hg-quiz-jp.answer{font-size:30px;}
.hg-quiz-en.answer{font-size:18px;}
.hg-quiz-answer{margin-top:18px;padding-top:18px;border-top:1px dashed var(--line);width:100%;
  display:flex;flex-direction:column;align-items:center;gap:5px;padding-bottom:6px;}
.hg-quiz-yomi{font-family:var(--jp-sans);font-size:14px;color:var(--stone);}
.hg-quiz-answer .hg-badge{margin-top:3px;}
.hg-reveal{margin-top:20px;background:var(--indigo);color:#fff;border:none;border-radius:999px;padding:10px 22px;font-size:14px;font-weight:600;}
.hg-reveal:hover{background:var(--indigo2);}
.hg-grade{display:flex;gap:11px;margin-top:14px;}
.hg-grade-btn{flex:1;display:flex;align-items:center;justify-content:center;gap:7px;padding:13px;border-radius:8px;font-size:14px;font-weight:600;border:1.5px solid;}
.hg-grade-btn.review{background:transparent;border-color:var(--stone);color:var(--sumi);}
.hg-grade-btn.review:hover{border-color:var(--citrus-deep);color:var(--citrus-deep);}
.hg-grade-btn.good{background:var(--indigo);border-color:var(--indigo);color:#fff;}
.hg-grade-btn.good:hover{background:var(--indigo2);}
.hg-result-ring{width:116px;height:116px;border-radius:50%;margin:0 auto 16px;display:grid;place-items:center;
  background:conic-gradient(var(--citrus) calc(var(--pct)*1%),var(--plaster2) 0);}
.hg-result-ring span{width:88px;height:88px;border-radius:50%;background:var(--card);display:grid;place-items:center;
  font-family:var(--en-serif);font-size:25px;font-weight:600;color:var(--indigo);}
.hg-result-line{font-size:14.5px;margin:0 0 20px;}
.hg-result-line strong{color:var(--citrus-deep);}
.hg-result-btns{display:flex;flex-direction:column;gap:9px;align-items:center;}
.hg-result-btns .hg-primary,.hg-result-btns .hg-ghost{width:100%;justify-content:center;}
.hg-footer{max-width:1080px;margin:18px auto 0;padding:16px 24px 28px;font-size:12px;color:var(--stone);border-top:1px solid var(--line2);}

@media(max-width:560px){
  .hg-scroll{display:none;}
  .hg-title{font-size:40px;}
  .hg-header-inner{padding:20px 16px 16px;flex-wrap:wrap;}
  .hg-furi-toggle{margin-left:auto;}
  .hg-main{padding:20px 14px 8px;}
  .hg-tab-en{display:none;}
  .hg-src-break{grid-template-columns:1fr;gap:16px;}
  .hg-src-jp{font-size:19px;}
}
@media(prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important;}}
`;

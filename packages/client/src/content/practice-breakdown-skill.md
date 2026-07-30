---
name: sentence-bank-breakdown
description: >-
  Break down one Japanese sentence into a sentence-bank "practice sentence" as JSON — reading,
  translation, the single study target, a pre-lookup guess, a literal gloss, register, nuance, and
  word/grammar breakdowns. Use whenever the user wants JSON to paste into the sentence-bank app's
  "Import a breakdown" box.
---

# Sentence-bank breakdown author

You take **one Japanese sentence** the user is studying and produce **one JSON object** describing it
as a *practice sentence* for the sentence-bank app — a single richly-annotated study card.

If the user attaches a **screenshot** (a manga panel, a subtitle, a textbook page), use it for context:
read the surrounding situation, who is speaking, and to whom, and let that inform `register` and
`nuance`. The screenshot itself is attached separately in the app; you only need to read it.

## How to respond

Output **only the JSON object**, in a single ```json code block, and nothing else — no preamble, no
explanation. The user pastes it straight into the app, which validates it against the exact schema
below. Unknown keys are rejected, so do not invent fields; omit anything you don't have.

## The JSON contract

| field | type | notes |
|---|---|---|
| `text` | string | **required** — the sentence, copied exactly (kanji as written) |
| `language` | string | defaults to `"Japanese"`; set it only for another language |
| `reading` | string | reading of just the tricky parts (kana), not full furigana |
| `translation` | string | a natural English translation |
| `target` | string | the **one** thing this sentence is best for studying |
| `targetKind` | enum | one of `word` \| `grammar` \| `idiom` \| `collocation` \| `reading` |
| `guess` | string | a plausible pre-lookup guess at the meaning (what a learner might assume) |
| `literal` | string | a literal / structural gloss, when the structure is worth spelling out |
| `register` | string | politeness / speech level, e.g. `"casual (タメ口)"`, `"polite (です・ます)"` |
| `nuance` | string | who says this, to whom, and what would be off instead |
| `words` | Word[] | the notable words: `{ "w", "r", "m" }` = word, reading, meaning |
| `grammar` | Grammar[] | the grammar points: `{ "p", "n" }` = pattern, what it does |

Only `text` is required; include the rest when you can say something useful. Keep `words` to the words
worth studying (not every particle), and `grammar` to the real patterns in the sentence.

## Compact example

```json
{
  "text": "電気を消してくれる？",
  "language": "Japanese",
  "reading": "でんき を けして くれる",
  "translation": "Could you turn off the light (for me)?",
  "target": "〜てくれる",
  "targetKind": "grammar",
  "guess": "Something about turning off the light.",
  "literal": "Do the turning-off-of-the-light (as a favor to me)?",
  "register": "casual (タメ口)",
  "nuance": "Said to a friend or family member. To a stranger or superior you'd use 〜てくれますか / 〜ていただけますか.",
  "words": [
    { "w": "電気", "r": "でんき", "m": "light; electricity" },
    { "w": "消す", "r": "けす", "m": "to turn off; to erase" }
  ],
  "grammar": [
    { "p": "〜てくれる", "n": "someone does something as a favor to me/us; casual request as a question" }
  ]
}
```

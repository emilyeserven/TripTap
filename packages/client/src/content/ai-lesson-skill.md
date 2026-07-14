---
name: sentence-bank-lesson
description: >-
  Generate a sentence-bank AI Lesson as JSON — from a website URL (mine its real
  sentences, vocab, grammar, and culture) or from a freeform topic request
  ("make a Japanese lesson about ordering at a café"). Use whenever the user
  wants AI Lesson JSON to paste into the sentence-bank app's "Import an AI Lesson" box.
---

# Sentence-bank AI Lesson author

You produce **one JSON object** describing a language-study *AI Lesson* for the sentence-bank app.
The app renders it as five tabs — Culture, Vocabulary, Grammar, Source, Practice — and stores each
item as its own record tagged with the AI Lesson.

## How to respond

Output **only the JSON object**, in a single ```json code block, and nothing else — no preamble,
no explanation. The user copies it straight into the app's paste box, which validates it against the
exact schema below. Unknown keys are rejected, so do not invent fields.

## Two modes

- **From a URL**: Read the page. Pull *real* sentences from it into `source` (keep the original
  wording; record where each came from in `where` and link it in `url`). Mine the useful words into
  `vocab`, extract the grammar patterns the sentences use into `grammar`, and write short `culture`
  notes explaining context a learner needs. Set `sourceUrl` to the page and `sourceLabel` to a short
  tab name (e.g. "From the inn", "The comments").
- **From a topic**: Invent representative, natural content for the topic and target level. `source`
  can hold example sentences you compose; set `where` to a short label (e.g. "Example") and omit
  `url`.

Aim for roughly 20–35 vocab, 3–5 grammar patterns, 5–15 source sentences, and 3–5 culture notes,
scaled to the material.

## The JSON contract

Top-level object:

| field | type | notes |
|---|---|---|
| `slug` | string | lowercase letters, numbers, hyphens only; unique per AI Lesson |
| `title` | string | plain text, e.g. `"萩への旅"` |
| `eyebrow` | string | small kicker above the title |
| `subtitle` | string | one-line description |
| `scrollText` | string | short decorative header text (often the source's name) |
| `footerText` | string | attribution / disclaimer line |
| `targetLevel` | string | overall JLPT target, e.g. `"N4"` |
| `sourceUrl` | string \| null | attribution link (optional) |
| `videoUrl` | string \| null | e.g. a YouTube source (optional) |
| `sourceLabel` | string \| null | EN label for the "Source" tab (optional; defaults to "Source") |
| `categories` | Category[] | the vocab filter chips |
| `vocab` | Vocab[] | flashcard vocabulary |
| `grammar` | Grammar[] | grammar patterns |
| `source` | SourceSentence[] | real/example sentences with breakdown |
| `culture` | CultureNote[] | short context cards |

**Category** `{ "key", "jp", "en", "icon" }` — `key` is referenced by each vocab's `cat`.
**Vocab** `{ "jp", "yomi", "en", "lvl", "cat" }` — `cat` must equal one of the category keys.
**Grammar** `{ "pat", "gloss", "note", "ex": [ { "jp", "en" } ] }`.
**SourceSentence** `{ "jp", "en", "where", "url"?, "grammar": [ { "p", "d" } ], "vocab": [ { "w", "y", "m", "lvl" } ] }`
— `p`=pattern, `d`=description; `w`=word, `y`=reading, `m`=meaning.
**CultureNote** `{ "icon", "jp", "en", "body", "terms": [string] }` — `terms` are words to surface as
hover chips; prefer terms that also appear in `vocab` (matched by `jp`).

### Rules

- `lvl` is a free string: use `"N1"`–`"N5"` for JLPT words (they get a solid badge); anything else
  (`"travel"`, `"local"`, `"food"`, …) renders as a plain tag.
- Every `vocab[].cat` and every category `key` must line up. Don't include an "all" category — the app
  adds the "All" filter itself.
- `icon` must be one of these keys only:
  `sparkles`, `home`, `utensils`, `landmark`, `bus`, `waves`, `sun`, `book-open`, `graduation-cap`,
  `scroll-text`, `ghost`, `message-square`, `music`, `history`, `clapperboard`, `map-pin`.
  Pick the closest match; use `sparkles` if nothing fits.

## Compact example

```json
{
  "slug": "cafe-basics",
  "title": "カフェで注文",
  "eyebrow": "Everyday Japanese",
  "subtitle": "Ordering drinks and paying at a café.",
  "scrollText": "カフェ",
  "footerText": "Study aid — example sentences for language learning.",
  "targetLevel": "N5",
  "sourceUrl": null,
  "videoUrl": null,
  "sourceLabel": "Examples",
  "categories": [
    { "key": "drinks", "jp": "飲み物", "en": "Drinks", "icon": "utensils" },
    { "key": "paying", "jp": "会計", "en": "Paying", "icon": "landmark" }
  ],
  "vocab": [
    { "jp": "珈琲", "yomi": "コーヒー", "en": "coffee", "lvl": "N5", "cat": "drinks" },
    { "jp": "会計", "yomi": "かいけい", "en": "bill, check", "lvl": "N4", "cat": "paying" }
  ],
  "grammar": [
    {
      "pat": "〜をください",
      "gloss": "Please give me ~",
      "note": "Noun + をください is the basic polite request for ordering.",
      "ex": [ { "jp": "コーヒーをください。", "en": "A coffee, please." } ]
    }
  ],
  "source": [
    {
      "jp": "ホットコーヒーを一つお願いします。",
      "en": "One hot coffee, please.",
      "where": "Example",
      "grammar": [ { "p": "お願いします", "d": "'Please' — a polite request softer than ください." } ],
      "vocab": [ { "w": "一つ", "y": "ひとつ", "m": "one (thing)", "lvl": "N5" } ]
    }
  ],
  "culture": [
    {
      "icon": "utensils",
      "jp": "カフェ文化",
      "en": "Café culture",
      "body": "Ordering at the counter is common; you often pay first, then wait for your drink.",
      "terms": ["珈琲", "会計"]
    }
  ]
}
```

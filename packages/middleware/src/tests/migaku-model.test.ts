import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isMigakuModel } from "@/services/migaku/detect";
import { parseMigakuModelNote } from "@/services/migaku/migaku-model";

/** Build a lowercased-field map like `fieldMap` produces, from a plain object. */
function fields(obj: Record<string, string>): Map<string, string> {
  return new Map(Object.entries(obj).map(([k, v]) => [k.toLowerCase(), v]));
}

const NOTE = {
  "Word": "ドジっ子",
  "Sentence": "<t>ドジっ子</t>魔女。",
  "Translated Sentence": "Clumsy witch.",
  "Definitions": "<p>ドジっ子 (どじっこ) ★</p><p>∙ clumsy girl</p><p>∙ Noun</p>",
  "Example Sentences": "",
  "Notes": "An endearingly clumsy girl.",
  "Images": "<img src=\"pic.webp\">",
  "Sentence Audio": "[sound:sentence.m4a]",
  "Word Audio": "[sound:word.m4a]",
};

describe("isMigakuModel", () => {
  it("recognizes the Migaku Sentence note type by its signature fields", () => {
    assert.equal(isMigakuModel(Object.keys(NOTE)), true);
  });

  it("rejects a generic note type", () => {
    assert.equal(isMigakuModel(["Expression", "Meaning", "Audio"]), false);
  });
});

describe("parseMigakuModelNote", () => {
  it("maps a note to a linked vocab + sentence, splitting fields by word vs sentence", () => {
    const parsed = parseMigakuModelNote(fields(NOTE), "migaku, n5");
    assert.ok(parsed);
    const {
      candidates, group,
    } = parsed;

    const vocab = candidates.find(c => c.kind === "vocab");
    const sentence = candidates.find(c => c.kind === "sentence");
    assert.ok(vocab);
    assert.ok(sentence);

    // Vocab ← Word / Definitions (reading + gloss, header dropped) / Notes / Word Audio.
    assert.equal(vocab.text, "ドジっ子");
    assert.deepEqual(vocab.reading, [{
      t: "ドジっ子",
      r: "どじっこ",
    }]);
    assert.ok(vocab.meaning?.includes("clumsy girl"));
    assert.ok(!vocab.meaning?.includes("どじっこ")); // the header line is dropped
    assert.equal(vocab.notes, "An endearingly clumsy girl.");
    assert.equal(vocab.audioFile, "word.m4a");
    assert.equal(vocab.imageFile, null);

    // Sentence ← Sentence (markup stripped) / Translated Sentence / Sentence Audio / Images.
    assert.equal(sentence.text, "ドジっ子魔女。");
    assert.equal(sentence.meaning, "Clumsy witch.");
    assert.equal(sentence.audioFile, "sentence.m4a");
    assert.equal(sentence.imageFile, "pic.webp");
    assert.deepEqual(sentence.reading, []); // no ruby on the card → generated at commit

    // Group links them and carries the image flag.
    assert.equal(group.vocabId, vocab.id);
    assert.deepEqual(group.sentenceIds, [sentence.id]);
    assert.equal(group.hasImage, true);
    assert.equal(vocab.groupId, group.id);
    assert.equal(sentence.groupId, group.id);
  });

  it("turns extra Example Sentences into additional linked sentence candidates", () => {
    const parsed = parseMigakuModelNote(
      fields({
        ...NOTE,
        "Example Sentences": "一つ目の例。<br>二つ目の例。",
      }),
      "migaku",
    );
    assert.ok(parsed);
    const sentences = parsed.candidates.filter(c => c.kind === "sentence");
    assert.equal(sentences.length, 3); // primary + 2 examples
    assert.equal(parsed.group.sentenceIds.length, 3);
    assert.ok(sentences.some(s => s.text === "一つ目の例。"));
  });

  it("returns a vocab-only group when the sentence field is empty", () => {
    const parsed = parseMigakuModelNote(
      fields({
        ...NOTE,
        "Sentence": "",
        "Example Sentences": "",
      }),
      "migaku",
    );
    assert.ok(parsed);
    assert.equal(parsed.group.sentenceIds.length, 0);
    assert.ok(parsed.group.vocabId);
  });

  it("returns null when neither a word nor a sentence is present", () => {
    const parsed = parseMigakuModelNote(
      fields({
        ...NOTE,
        "Word": "",
        "Sentence": "",
        "Example Sentences": "",
      }),
      "migaku",
    );
    assert.equal(parsed, null);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cuesToSegments,
  extractCaptionTracks,
  json3ToCues,
  parseVideoId,
  pickCaptionTrack,
} from "@/services/youtube-captions";

describe("parseVideoId", () => {
  it("reads the id from the common URL shapes", () => {
    assert.equal(parseVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), "dQw4w9WgXcQ");
    assert.equal(parseVideoId("https://youtu.be/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
    assert.equal(parseVideoId("https://www.youtube.com/embed/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
    assert.equal(parseVideoId("https://youtube.com/shorts/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
    assert.equal(parseVideoId("dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  });

  it("returns null for non-YouTube or malformed input", () => {
    assert.equal(parseVideoId("https://example.com/watch?v=dQw4w9WgXcQ"), null);
    assert.equal(parseVideoId("not a url"), null);
    assert.equal(parseVideoId("https://youtu.be/short"), null);
  });
});

describe("extractCaptionTracks", () => {
  it("pulls tracks out of the embedded player response", () => {
    const player = {
      captions: {
        playerCaptionsTracklistRenderer: {
          captionTracks: [
            {
              baseUrl: "https://youtube.com/api/timedtext?lang=ja&x=1",
              languageCode: "ja",
              name: {
                simpleText: "Japanese",
              },
            },
            {
              baseUrl: "https://youtube.com/api/timedtext?lang=en&x=2",
              languageCode: "en",
              kind: "asr",
              name: {
                runs: [{
                  text: "English (auto-generated)",
                }],
              },
            },
          ],
        },
      },
    };
    // Wrap in noise + a trailing key so the balanced-brace slice must stop at the right place.
    const html = `<script>var ytInitialPlayerResponse = ${JSON.stringify(player)};var x={a:1};</script>`;
    const tracks = extractCaptionTracks(html);
    assert.equal(tracks.length, 2);
    assert.equal(tracks[0].languageCode, "ja");
    assert.equal(tracks[0].name, "Japanese");
    assert.equal(tracks[1].kind, "asr");
    assert.equal(tracks[1].name, "English (auto-generated)");
  });

  it("returns an empty list when the marker or captions are absent", () => {
    assert.deepEqual(extractCaptionTracks("<html>no player here</html>"), []);
    assert.deepEqual(extractCaptionTracks("ytInitialPlayerResponse = {\"videoDetails\":{}};"), []);
  });
});

describe("pickCaptionTrack", () => {
  const tracks = [
    {
      baseUrl: "a",
      languageCode: "en",
      name: "English",
      kind: "asr",
    },
    {
      baseUrl: "b",
      languageCode: "ja",
      name: "Japanese",
    },
  ];

  it("prefers a human track in the requested language (by display name)", () => {
    assert.equal(pickCaptionTrack(tracks, "Japanese")?.baseUrl, "b");
  });

  it("accepts a BCP-47 code too", () => {
    assert.equal(pickCaptionTrack(tracks, "ja")?.baseUrl, "b");
  });

  it("falls back to the first human track, then the first track", () => {
    assert.equal(pickCaptionTrack(tracks, "de")?.baseUrl, "b"); // no German → first human
    assert.equal(pickCaptionTrack([tracks[0]], "de")?.baseUrl, "a"); // only asr → first track
    assert.equal(pickCaptionTrack([], "ja"), null);
  });
});

describe("json3ToCues", () => {
  it("builds cues, skipping style-only and blank events", () => {
    const cues = json3ToCues({
      events: [
        {
          tStartMs: 0,
          dDurationMs: 1200,
          segs: [{
            utf8: "おはよう",
          }],
        },
        {
          tStartMs: 1200,
          segs: [{
            utf8: "\n",
          }],
        }, // blank → dropped
        {
          tStartMs: 2000,
        }, // no segs → dropped
        {
          tStartMs: 2500,
          dDurationMs: 800,
          segs: [{
            utf8: "ござ",
          }, {
            utf8: "います",
          }],
        },
      ],
    });
    assert.deepEqual(cues, [
      {
        startMs: 0,
        endMs: 1200,
        text: "おはよう",
      },
      {
        startMs: 2500,
        endMs: 3300,
        text: "ございます",
      },
    ]);
  });
});

describe("cuesToSegments", () => {
  it("merges short adjacent cues up to the minimum length", () => {
    const segments = cuesToSegments(
      [
        {
          startMs: 0,
          endMs: 500,
          text: "A",
        },
        {
          startMs: 500,
          endMs: 1000,
          text: "B",
        },
        {
          startMs: 1000,
          endMs: 1400,
          text: "C",
        },
        {
          startMs: 5000,
          endMs: 6800,
          text: "D",
        },
      ],
      {
        minSegmentMs: 1500,
        gapMs: 400,
        maxSegmentMs: 8000,
      },
    );
    // A+B+C merge (still short / contiguous); D is long enough and far away → its own segment.
    assert.equal(segments.length, 2);
    assert.deepEqual(segments[0], {
      startMs: 0,
      endMs: 1400,
      label: "A B C",
    });
    assert.deepEqual(segments[1], {
      startMs: 5000,
      endMs: 6800,
      label: "D",
    });
  });

  it("never exceeds the max span and truncates long labels", () => {
    const long = "x".repeat(200);
    const segments = cuesToSegments(
      [
        {
          startMs: 0,
          endMs: 7000,
          text: long,
        },
        {
          startMs: 7000,
          endMs: 9000,
          text: "next",
        },
      ],
      {
        maxSegmentMs: 8000,
        maxLabelChars: 120,
      },
    );
    // Merging would span 9000ms > max → kept separate.
    assert.equal(segments.length, 2);
    assert.equal(segments[0].label.length, 120);
    assert.ok(segments[0].label.endsWith("…"));
  });
});

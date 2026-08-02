/**
 * Shared "Handwriting" domain types.
 *
 * Backs the draw-a-character affordance on the dictionary lookup: the learner draws a character they
 * can see but can't type, and the middleware proxy (`POST /api/handwriting/recognize`) returns ranked
 * candidate characters to insert into the search box.
 *
 * These types are deliberately **provider-neutral** — plain canvas coordinates in, plain characters
 * out. The upstream recognizer's own ink encoding is an implementation detail of
 * `services/handwriting/`, exactly as {@link DictionaryProvider} keeps the dictionary swappable.
 */

/** One drawn stroke: parallel x/y arrays in canvas CSS pixels, in the order the points were drawn. */
export interface HandwritingStroke {
  /** X coordinates, one per sampled point. */
  x: number[];
  /** Y coordinates, one per sampled point — the same length as {@link HandwritingStroke.x}. */
  y: number[];
}

/** Body for `POST /api/handwriting/recognize`. Responds with ranked candidate characters. */
export interface RecognizeHandwritingInput {
  /** Canvas width in CSS pixels — the recognizer normalizes the ink against the drawing area. */
  width: number;
  /** Canvas height in CSS pixels. */
  height: number;
  /** The strokes drawn so far, in draw order. An empty list yields no candidates. */
  strokes: HandwritingStroke[];
  /** Max candidates to return; omitted falls back to the server default. */
  limit?: number;
}

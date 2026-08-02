/**
 * The dashed underline marking a phrase an explanation refers to. Shared by `ExplainedSentence`
 * (the phrase inside the sentence) and `ExplanationBody` (the same phrase heading its note), so the
 * identical styling is what tells the reader the two are the same thing.
 */
export const REFERENCE_UNDERLINE = `
  underline decoration-dashed decoration-1 decoration-muted-foreground/70
  underline-offset-4
`;

/**
 * The highlight a referenced phrase gets when its note is hovered elsewhere (e.g. the note list in
 * `ExplanationBody`), so the reader can find which part of the sentence a note is about.
 */
export const REFERENCE_HIGHLIGHT = "rounded-sm bg-primary/15 ring-1 ring-primary/30";

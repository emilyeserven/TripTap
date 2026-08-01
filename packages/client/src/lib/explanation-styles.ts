/**
 * The dashed underline marking a phrase an explanation refers to. Shared by `ExplainedSentence`
 * (the phrase inside the sentence) and `ExplanationBody` (the same phrase heading its note), so the
 * identical styling is what tells the reader the two are the same thing.
 */
export const REFERENCE_UNDERLINE = `
  underline decoration-dashed decoration-1 decoration-muted-foreground/70
  underline-offset-4
`;

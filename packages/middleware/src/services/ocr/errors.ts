/** Raised when the OCR feature is used but no OCR backend is configured. */
export class OcrNotConfiguredError extends Error {
  constructor(message = "OCR service not configured") {
    super(message);
    this.name = "OcrNotConfiguredError";
  }
}

/** Raised when every configured OCR backend is unreachable, times out, or errors. */
export class OcrUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OcrUnavailableError";
  }
}

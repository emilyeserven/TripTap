/** Raised when an uploaded file isn't a parseable legacy `.apkg` (bad zip, missing/newer collection). */
export class MigakuParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MigakuParseError";
  }
}

/** Raised when an operation references a staged import that doesn't exist. */
export class MigakuImportNotFoundError extends Error {
  constructor(message = "Import not found") {
    super(message);
    this.name = "MigakuImportNotFoundError";
  }
}

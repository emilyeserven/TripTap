/** Raised when media storage is used but no S3/Garage backend is configured. */
export class MediaNotConfiguredError extends Error {
  constructor(message = "Media storage (S3/Garage) is not configured") {
    super(message);
    this.name = "MediaNotConfiguredError";
  }
}

/** Raised when the object store is configured but a request to it fails. */
export class MediaUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaUnavailableError";
  }
}

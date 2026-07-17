/**
 * Object-storage (S3-compatible, e.g. Garage) wrapper for imported card media.
 *
 * TripTap owns a dedicated bucket, so everything lives under the {@link MEDIA_PREFIX} prefix and the
 * reconciliation sweep (`services/migaku`) can safely delete anything there that no row references.
 * All operations resolve config lazily from env so the app (and unit tests) run without S3 configured;
 * calls made while unconfigured throw {@link MediaNotConfiguredError}, which routes map to 503.
 */

import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { MediaNotConfiguredError, MediaUnavailableError } from "@/services/media/errors";

export { MediaNotConfiguredError, MediaUnavailableError } from "@/services/media/errors";

/** All app-managed objects live under this key prefix within the bucket. */
export const MEDIA_PREFIX = "migaku/";

interface MediaConfig {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  forcePathStyle: boolean;
}

/** Resolve S3/Garage config from env, or null when the essential vars are absent. */
function resolveConfig(): MediaConfig | null {
  const endpoint = process.env.S3_ENDPOINT?.trim();
  const accessKeyId = process.env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.S3_BUCKET?.trim();
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) return null;
  return {
    endpoint,
    region: process.env.S3_REGION?.trim() || "garage",
    accessKeyId,
    secretAccessKey,
    bucket,
    // Garage requires path-style addressing; default on unless explicitly disabled.
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE?.trim() !== "false",
  };
}

/** True when media storage is configured (used by routes to 503 early with a clear message). */
export function isMediaConfigured(): boolean {
  return resolveConfig() !== null;
}

let cachedClient: { client: S3Client;
  bucket: string; } | null = null;

function getClient(): { client: S3Client;
  bucket: string; } {
  const config = resolveConfig();
  if (!config) throw new MediaNotConfiguredError();
  // Reuse the client across requests, but rebuild if the target bucket changed (e.g. in tests).
  if (!cachedClient || cachedClient.bucket !== config.bucket) {
    cachedClient = {
      bucket: config.bucket,
      client: new S3Client({
        endpoint: config.endpoint,
        region: config.region,
        forcePathStyle: config.forcePathStyle,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
      }),
    };
  }
  return cachedClient;
}

/** A stored media object's bytes and content type. */
export interface StoredMedia {
  body: Buffer;
  contentType: string;
}

/** Upload one object; returns the key it was stored under. */
export async function putMedia(key: string, body: Buffer, contentType: string): Promise<string> {
  const {
    client, bucket,
  } = getClient();
  try {
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }));
    return key;
  }
  catch (err) {
    throw new MediaUnavailableError(`Failed to store media "${key}": ${String(err)}`);
  }
}

/** Fetch one object's bytes + content type, or null when it does not exist. */
export async function getMedia(key: string): Promise<StoredMedia | null> {
  const {
    client, bucket,
  } = getClient();
  try {
    const res = await client.send(new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }));
    if (!res.Body) return null;
    const bytes = await res.Body.transformToByteArray();
    return {
      body: Buffer.from(bytes),
      contentType: res.ContentType ?? "application/octet-stream",
    };
  }
  catch (err) {
    // Missing object → null; anything else is a real backend failure.
    if (err instanceof Error && err.name === "NoSuchKey") return null;
    throw new MediaUnavailableError(`Failed to read media "${key}": ${String(err)}`);
  }
}

/** Delete one object. No-op (resolves) when media storage is unconfigured, so deletes never block. */
export async function deleteMedia(key: string | null | undefined): Promise<void> {
  if (!key) return;
  if (!isMediaConfigured()) return;
  const {
    client, bucket,
  } = getClient();
  try {
    await client.send(new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }));
  }
  catch (err) {
    throw new MediaUnavailableError(`Failed to delete media "${key}": ${String(err)}`);
  }
}

/** One object listed from the bucket. */
export interface MediaObject {
  key: string;
  /** Upload time (S3 has no last-access time); used as the reconciliation grace-window signal. */
  lastModified: Date | null;
}

/** List every object under the app's media prefix (with upload times), paginating fully. */
export async function listMediaObjects(prefix = MEDIA_PREFIX): Promise<MediaObject[]> {
  const {
    client, bucket,
  } = getClient();
  const objects: MediaObject[] = [];
  let token: string | undefined;
  try {
    do {
      const res = await client.send(new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: token,
      }));
      for (const obj of res.Contents ?? []) {
        if (obj.Key) objects.push({
          key: obj.Key,
          lastModified: obj.LastModified ?? null,
        });
      }
      token = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (token);
  }
  catch (err) {
    throw new MediaUnavailableError(`Failed to list media: ${String(err)}`);
  }
  return objects;
}

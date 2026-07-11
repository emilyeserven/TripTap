import { desc, eq, sql } from "drizzle-orm";
import type {
  Capture,
  CaptureStatus,
  CaptureSummary,
  CreateCaptureInput,
} from "@sentence-bank/types";
import { db } from "@/db";
import { captures, type CaptureRow } from "@/db/schema";

/** The image-carrying details of a stored capture, for the dedicated image endpoint. */
export interface CaptureImage {
  image: Buffer;
  mime: string | null;
}

/** Columns common to summary + detail, excluding the heavy `image` bytea and (for lists) `blocks`. */
const summaryColumns = {
  id: captures.id,
  title: captures.title,
  text: captures.text,
  engines: captures.engines,
  sourceId: captures.sourceId,
  page: captures.page,
  notes: captures.notes,
  status: captures.status,
  imageWidth: captures.imageWidth,
  imageHeight: captures.imageHeight,
  createdAt: captures.createdAt,
  hasImage: sql<boolean>`${captures.image} is not null`,
} as const;

type SummaryRow = Pick<
  CaptureRow,
  "id" | "title" | "text" | "engines" | "sourceId" | "page" | "notes" | "status" | "imageWidth" | "imageHeight" | "createdAt"
> & { hasImage: boolean };

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function toSummary(row: SummaryRow): CaptureSummary {
  return {
    id: row.id,
    title: row.title,
    text: row.text,
    engines: row.engines,
    sourceId: row.sourceId,
    page: row.page,
    notes: row.notes,
    status: row.status as CaptureStatus,
    hasImage: row.hasImage,
    imageWidth: row.imageWidth,
    imageHeight: row.imageHeight,
    createdAt: toIso(row.createdAt),
  };
}

export async function listCaptures(): Promise<CaptureSummary[]> {
  const rows = await db
    .select(summaryColumns)
    .from(captures)
    .orderBy(desc(captures.createdAt));
  return rows.map(toSummary);
}

export async function getCapture(id: string): Promise<Capture | null> {
  const [row] = await db
    .select({
      ...summaryColumns,
      blocks: captures.blocks,
      imageMime: captures.imageMime,
    })
    .from(captures)
    .where(eq(captures.id, id));
  if (!row) return null;
  return {
    ...toSummary(row),
    blocks: row.blocks,
    imageMime: row.imageMime,
  };
}

export async function getCaptureImage(id: string): Promise<CaptureImage | null> {
  const [row] = await db
    .select({
      image: captures.image,
      mime: captures.imageMime,
    })
    .from(captures)
    .where(eq(captures.id, id));
  if (!row || !row.image) return null;
  return {
    image: row.image,
    mime: row.mime,
  };
}

/** The optional image bytes captured alongside the OCR payload. */
export interface CaptureImageInput {
  buffer: Buffer;
  mime: string | null;
  width: number | null;
  height: number | null;
}

export async function createCapture(
  input: CreateCaptureInput,
  image: CaptureImageInput | null,
): Promise<Capture> {
  const [row] = await db
    .insert(captures)
    .values({
      title: input.title ?? null,
      text: input.text,
      blocks: input.blocks,
      engines: input.engines,
      sourceId: input.sourceId ?? null,
      page: input.page ?? null,
      notes: input.notes ?? null,
      image: image?.buffer ?? null,
      imageMime: image?.mime ?? null,
      imageWidth: image?.width ?? null,
      imageHeight: image?.height ?? null,
    })
    .returning();
  return {
    id: row.id,
    title: row.title,
    text: row.text,
    blocks: row.blocks,
    engines: row.engines,
    sourceId: row.sourceId,
    page: row.page,
    notes: row.notes,
    status: row.status as CaptureStatus,
    hasImage: row.image != null,
    imageMime: row.imageMime,
    imageWidth: row.imageWidth,
    imageHeight: row.imageHeight,
    createdAt: toIso(row.createdAt),
  };
}

/** Fields of a capture that can be patched (never the image or OCR payload). */
export interface UpdateCaptureInput {
  title?: string | null;
  notes?: string | null;
  sourceId?: string | null;
  page?: string | null;
  status?: CaptureStatus;
}

export async function updateCapture(
  id: string,
  input: UpdateCaptureInput,
): Promise<Capture | null> {
  const [row] = await db.update(captures).set(input).where(eq(captures.id, id)).returning({
    id: captures.id,
  });
  if (!row) return null;
  return getCapture(id);
}

export async function deleteCapture(id: string): Promise<boolean> {
  const rows = await db.delete(captures).where(eq(captures.id, id)).returning({
    id: captures.id,
  });
  return rows.length > 0;
}

CREATE TABLE "migaku_imports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" text NOT NULL,
	"status" text DEFAULT 'parsed' NOT NULL,
	"apkg_key" text,
	"candidates" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sentences" ADD COLUMN "audio_key" text;--> statement-breakpoint
ALTER TABLE "sentences" ADD COLUMN "audio_mime" text;--> statement-breakpoint
ALTER TABLE "sentences" ADD COLUMN "image_key" text;--> statement-breakpoint
ALTER TABLE "sentences" ADD COLUMN "image_mime" text;--> statement-breakpoint
ALTER TABLE "vocab" ADD COLUMN "audio_key" text;--> statement-breakpoint
ALTER TABLE "vocab" ADD COLUMN "audio_mime" text;--> statement-breakpoint
ALTER TABLE "vocab" ADD COLUMN "image_key" text;--> statement-breakpoint
ALTER TABLE "vocab" ADD COLUMN "image_mime" text;
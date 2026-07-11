CREATE TABLE "captures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text,
	"text" text NOT NULL,
	"blocks" jsonb NOT NULL,
	"engines" jsonb NOT NULL,
	"source_id" uuid,
	"page" text,
	"notes" text,
	"status" text DEFAULT 'new' NOT NULL,
	"image" "bytea",
	"image_mime" text,
	"image_width" integer,
	"image_height" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "captures" ADD CONSTRAINT "captures_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
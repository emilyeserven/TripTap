CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text,
	"author" text,
	"url" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sentences" ADD COLUMN "source_id" uuid;--> statement-breakpoint
ALTER TABLE "sentences" ADD COLUMN "page" text;--> statement-breakpoint
ALTER TABLE "sentences" ADD CONSTRAINT "sentences_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE set null ON UPDATE no action;
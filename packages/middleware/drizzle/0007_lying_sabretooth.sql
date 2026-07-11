ALTER TABLE "sentences" ADD COLUMN "capture_id" uuid;--> statement-breakpoint
ALTER TABLE "vocab" ADD COLUMN "capture_id" uuid;--> statement-breakpoint
ALTER TABLE "sentences" ADD CONSTRAINT "sentences_capture_id_captures_id_fk" FOREIGN KEY ("capture_id") REFERENCES "public"."captures"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vocab" ADD CONSTRAINT "vocab_capture_id_captures_id_fk" FOREIGN KEY ("capture_id") REFERENCES "public"."captures"("id") ON DELETE set null ON UPDATE no action;
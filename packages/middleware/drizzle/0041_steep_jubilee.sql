ALTER TABLE "migaku_imports" ADD COLUMN "deck_name" text;--> statement-breakpoint
ALTER TABLE "migaku_imports" ADD COLUMN "sentences_created" integer;--> statement-breakpoint
ALTER TABLE "migaku_imports" ADD COLUMN "vocab_created" integer;--> statement-breakpoint
ALTER TABLE "migaku_imports" ADD COLUMN "skipped" integer;
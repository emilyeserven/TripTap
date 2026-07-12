CREATE TABLE "answer_sheets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_sheet_id" uuid NOT NULL,
	"title" text,
	"entries" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "question_sheets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"resource_terms" jsonb,
	"layout" text DEFAULT 'list' NOT NULL,
	"questions" jsonb,
	"grid" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "answer_sheets" ADD CONSTRAINT "answer_sheets_question_sheet_id_question_sheets_id_fk" FOREIGN KEY ("question_sheet_id") REFERENCES "public"."question_sheets"("id") ON DELETE restrict ON UPDATE no action;
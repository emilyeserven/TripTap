CREATE TABLE "lesson_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"key" text NOT NULL,
	"jp" text NOT NULL,
	"en" text NOT NULL,
	"icon" text NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_culture" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"icon" text NOT NULL,
	"jp" text NOT NULL,
	"en" text NOT NULL,
	"body" text NOT NULL,
	"terms" jsonb NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_grammar" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"pat" text NOT NULL,
	"gloss" text NOT NULL,
	"note" text NOT NULL,
	"examples" jsonb NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_source_sentences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"jp" text NOT NULL,
	"en" text NOT NULL,
	"where" text NOT NULL,
	"url" text,
	"grammar" jsonb NOT NULL,
	"vocab" jsonb NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_vocab" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"jp" text NOT NULL,
	"yomi" text NOT NULL,
	"en" text NOT NULL,
	"lvl" text NOT NULL,
	"cat" text NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"eyebrow" text NOT NULL,
	"subtitle" text NOT NULL,
	"scroll_text" text NOT NULL,
	"footer_text" text NOT NULL,
	"target_level" text NOT NULL,
	"source_url" text,
	"video_url" text,
	"source_label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lessons_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "lesson_categories" ADD CONSTRAINT "lesson_categories_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_culture" ADD CONSTRAINT "lesson_culture_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_grammar" ADD CONSTRAINT "lesson_grammar_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_source_sentences" ADD CONSTRAINT "lesson_source_sentences_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_vocab" ADD CONSTRAINT "lesson_vocab_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_categories_lesson_id_key_unique" ON "lesson_categories" USING btree ("lesson_id","key");
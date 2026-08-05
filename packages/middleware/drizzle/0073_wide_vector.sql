CREATE INDEX "ai_lesson_grammar_terms_gin" ON "ai_lesson_grammar" USING gin ("grammar_terms");--> statement-breakpoint
CREATE INDEX "ai_lesson_source_sentences_grammar_terms_gin" ON "ai_lesson_source_sentences" USING gin ("grammar_terms");--> statement-breakpoint
CREATE INDEX "listening_sessions_terms_gin" ON "listening_sessions" USING gin ("terms");--> statement-breakpoint
CREATE INDEX "my_sentences_terms_gin" ON "my_sentences" USING gin ("terms");--> statement-breakpoint
CREATE INDEX "my_sentences_incorrect_grammar_terms_gin" ON "my_sentences" USING gin ("incorrect_grammar_terms");--> statement-breakpoint
CREATE INDEX "practice_sentences_terms_gin" ON "practice_sentences" USING gin ("terms");--> statement-breakpoint
CREATE INDEX "question_sheets_grammar_terms_gin" ON "question_sheets" USING gin ("grammar_terms");--> statement-breakpoint
CREATE INDEX "sentences_terms_gin" ON "sentences" USING gin ("terms");--> statement-breakpoint
CREATE INDEX "shadowing_sessions_terms_gin" ON "shadowing_sessions" USING gin ("terms");--> statement-breakpoint
CREATE INDEX "writings_terms_gin" ON "writings" USING gin ("terms");
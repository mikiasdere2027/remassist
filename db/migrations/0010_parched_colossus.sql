ALTER TABLE "faq_items" ADD COLUMN "featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "faq_items" ADD COLUMN "featured_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "faq_items_featured_idx" ON "faq_items" USING btree ("featured","featured_order");
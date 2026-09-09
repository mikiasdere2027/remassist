CREATE TYPE "public"."popup_placement" AS ENUM('everywhere', 'home', 'services', 'pricing', 'blog', 'faq', 'reviews');--> statement-breakpoint
CREATE TABLE "popups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"image" text,
	"cta_label" text NOT NULL,
	"cta_href" text NOT NULL,
	"campaign" text NOT NULL,
	"tracking_key" text NOT NULL,
	"placement" "popup_placement" DEFAULT 'everywhere' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"delay_seconds" integer DEFAULT 1 NOT NULL,
	"display_seconds" integer,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "popups_tracking_key_unique" UNIQUE("tracking_key")
);
--> statement-breakpoint
CREATE INDEX "popups_live_placement_idx" ON "popups" USING btree ("published","placement");--> statement-breakpoint
CREATE INDEX "popups_schedule_idx" ON "popups" USING btree ("starts_at","ends_at");
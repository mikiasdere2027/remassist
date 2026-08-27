CREATE TYPE "public"."lead_source" AS ENUM('qualify_quiz', 'ask_widget', 'contact_form', 'pricing_cta');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('new', 'contacted', 'qualified', 'won', 'lost', 'spam');--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"phone" text,
	"company" text,
	"message" text,
	"source" "lead_source" NOT NULL,
	"status" "lead_status" DEFAULT 'new' NOT NULL,
	"page_url" text,
	"referrer" text,
	"utm" jsonb
);
--> statement-breakpoint
CREATE TABLE "quiz_submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"answers" jsonb NOT NULL,
	"result" jsonb NOT NULL,
	"completed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_tiers" (
	"key" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"hourly_rate_usd" numeric(6, 2) NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coverage_options" (
	"key" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"long_label" text NOT NULL,
	"seats" integer NOT NULL,
	"monthly_hours" integer NOT NULL,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_categories" (
	"key" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"nav_blurb" text,
	"sort_order" integer NOT NULL,
	CONSTRAINT "service_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "quiz_submissions" ADD CONSTRAINT "quiz_submissions_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "leads_created_idx" ON "leads" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "leads_email_idx" ON "leads" USING btree ("email");--> statement-breakpoint
CREATE INDEX "leads_status_idx" ON "leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "quiz_created_idx" ON "quiz_submissions" USING btree ("created_at" DESC NULLS LAST);
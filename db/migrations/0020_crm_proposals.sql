-- CRM phase 6: proposals. Additive only.

CREATE TYPE "public"."proposal_status" AS ENUM('draft', 'sent', 'viewed', 'accepted', 'declined', 'withdrawn');--> statement-breakpoint

CREATE TABLE "proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid DEFAULT '00000000-0000-4000-8000-000000000001' NOT NULL,
	"deal_id" uuid NOT NULL,
	"number" text NOT NULL,
	"title" text NOT NULL,
	"status" "proposal_status" DEFAULT 'draft' NOT NULL,
	"intro" text,
	"terms" text,
	"lines" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"discount_bps" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"monthly_cents" integer DEFAULT 0 NOT NULL,
	"one_off_cents" integer DEFAULT 0 NOT NULL,
	"valid_until" date,
	"public_token" text NOT NULL,
	"recipient_name" text,
	"recipient_email" text,
	"sent_at" timestamp with time zone,
	"viewed_at" timestamp with time zone,
	"decided_at" timestamp with time zone,
	"decided_by_name" text,
	"decision_note" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "proposals_discount_range" CHECK ("discount_bps" BETWEEN 0 AND 10000),
	CONSTRAINT "proposals_money_nonnegative" CHECK ("monthly_cents" >= 0 AND "one_off_cents" >= 0)
);--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "proposals_token_uq" ON "proposals" USING btree ("public_token");--> statement-breakpoint
CREATE UNIQUE INDEX "proposals_number_uq" ON "proposals" USING btree ("workspace_id","number");--> statement-breakpoint
CREATE INDEX "proposals_deal_idx" ON "proposals" USING btree ("deal_id");--> statement-breakpoint
CREATE INDEX "proposals_workspace_status_idx" ON "proposals" USING btree ("workspace_id","status");

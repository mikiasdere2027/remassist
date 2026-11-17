-- CRM phase 2: pipeline stages, loss reasons, deals; deal links on the
-- timeline and tasks. Additive only (runs while the previous release serves).
-- The Rem Assist workspace is seeded with the staffing pipeline.

CREATE TYPE "public"."stage_kind" AS ENUM('open', 'won', 'lost');--> statement-breakpoint

CREATE TABLE "pipeline_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid DEFAULT '00000000-0000-4000-8000-000000000001' NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"probability" integer DEFAULT 0 NOT NULL,
	"kind" "stage_kind" DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "pipeline_stages_probability_range" CHECK ("probability" BETWEEN 0 AND 100)
);--> statement-breakpoint
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pipeline_stages_workspace_idx" ON "pipeline_stages" USING btree ("workspace_id","position");--> statement-breakpoint

CREATE TABLE "loss_reasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid DEFAULT '00000000-0000-4000-8000-000000000001' NOT NULL,
	"label" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);--> statement-breakpoint
ALTER TABLE "loss_reasons" ADD CONSTRAINT "loss_reasons_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint

CREATE TABLE "deals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid DEFAULT '00000000-0000-4000-8000-000000000001' NOT NULL,
	"title" text NOT NULL,
	"company_id" uuid,
	"contact_id" uuid,
	"lead_id" uuid,
	"owner_id" text,
	"stage_id" uuid NOT NULL,
	"service" text,
	"tier" text,
	"seats" integer,
	"hours_per_month" integer,
	"rate_cents" integer,
	"monthly_value_cents" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"probability" integer,
	"expected_close" date,
	"stage_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"loss_reason_id" uuid,
	"loss_note" text,
	"quiz_submission_id" uuid,
	"custom" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "deals_probability_range" CHECK ("probability" IS NULL OR "probability" BETWEEN 0 AND 100),
	CONSTRAINT "deals_money_nonnegative" CHECK ("monthly_value_cents" >= 0 AND ("rate_cents" IS NULL OR "rate_cents" >= 0))
);--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_stage_id_pipeline_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."pipeline_stages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_loss_reason_id_loss_reasons_id_fk" FOREIGN KEY ("loss_reason_id") REFERENCES "public"."loss_reasons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "deals_workspace_stage_idx" ON "deals" USING btree ("workspace_id","stage_id");--> statement-breakpoint
CREATE INDEX "deals_owner_idx" ON "deals" USING btree ("workspace_id","owner_id");--> statement-breakpoint
CREATE INDEX "deals_company_idx" ON "deals" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "deals_lead_idx" ON "deals" USING btree ("lead_id");--> statement-breakpoint

ALTER TABLE "activities" ADD COLUMN "deal_id" uuid;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_deal_idx" ON "activities" USING btree ("deal_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "deal_id" uuid;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tasks_deal_idx" ON "tasks" USING btree ("deal_id");--> statement-breakpoint

-- Staffing pipeline for the Rem Assist workspace. Fixed ids so re-running is a no-op.
INSERT INTO "pipeline_stages" ("id", "workspace_id", "name", "position", "probability", "kind") VALUES
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000001', 'Discovery booked', 10, 20, 'open'),
  ('00000000-0000-4000-8000-0000000000a2', '00000000-0000-4000-8000-000000000001', 'Discovery held', 20, 35, 'open'),
  ('00000000-0000-4000-8000-0000000000a3', '00000000-0000-4000-8000-000000000001', 'Proposal sent', 30, 55, 'open'),
  ('00000000-0000-4000-8000-0000000000a4', '00000000-0000-4000-8000-000000000001', 'Negotiation', 40, 75, 'open'),
  ('00000000-0000-4000-8000-0000000000a8', '00000000-0000-4000-8000-000000000001', 'Won', 80, 100, 'won'),
  ('00000000-0000-4000-8000-0000000000a9', '00000000-0000-4000-8000-000000000001', 'Lost', 90, 0, 'lost')
ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint

INSERT INTO "loss_reasons" ("id", "workspace_id", "label", "position") VALUES
  ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-000000000001', 'Price', 10),
  ('00000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-000000000001', 'Chose another provider', 20),
  ('00000000-0000-4000-8000-0000000000b3', '00000000-0000-4000-8000-000000000001', 'Hired in-house', 30),
  ('00000000-0000-4000-8000-0000000000b4', '00000000-0000-4000-8000-000000000001', 'Timing — not now', 40),
  ('00000000-0000-4000-8000-0000000000b5', '00000000-0000-4000-8000-000000000001', 'No budget', 50),
  ('00000000-0000-4000-8000-0000000000b6', '00000000-0000-4000-8000-000000000001', 'Stopped responding', 60),
  ('00000000-0000-4000-8000-0000000000b7', '00000000-0000-4000-8000-000000000001', 'Not a fit', 70)
ON CONFLICT ("id") DO NOTHING;

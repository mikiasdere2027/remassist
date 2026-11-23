-- CRM phase 3: customer engagements and private attachments, plus engagement
-- links on the timeline and tasks. Additive only. Won deals that already exist
-- get an engagement so no customer is missing from the Customers list.

CREATE TYPE "public"."engagement_status" AS ENUM('onboarding', 'active', 'paused', 'churned');--> statement-breakpoint
CREATE TYPE "public"."attachment_kind" AS ENUM('contract', 'proposal', 'invoice', 'other');--> statement-breakpoint

CREATE TABLE "engagements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid DEFAULT '00000000-0000-4000-8000-000000000001' NOT NULL,
	"company_id" uuid,
	"deal_id" uuid,
	"title" text NOT NULL,
	"service" text,
	"status" "engagement_status" DEFAULT 'onboarding' NOT NULL,
	"owner_id" text,
	"monthly_value_cents" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"roles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"onboarding" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"start_date" date,
	"contract_end" date,
	"renewal_date" date,
	"notice_days" integer,
	"churned_at" timestamp with time zone,
	"churn_reason" text,
	"custom" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "engagements_value_nonnegative" CHECK ("monthly_value_cents" >= 0),
	CONSTRAINT "engagements_notice_nonnegative" CHECK ("notice_days" IS NULL OR "notice_days" >= 0)
);--> statement-breakpoint
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engagements" ADD CONSTRAINT "engagements_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "engagements_workspace_status_idx" ON "engagements" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "engagements_company_idx" ON "engagements" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "engagements_deal_uq" ON "engagements" USING btree ("deal_id") WHERE "engagements"."deal_id" is not null;--> statement-breakpoint
CREATE INDEX "engagements_renewal_idx" ON "engagements" USING btree ("workspace_id","renewal_date") WHERE "engagements"."renewal_date" is not null;--> statement-breakpoint

CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid DEFAULT '00000000-0000-4000-8000-000000000001' NOT NULL,
	"kind" "attachment_kind" DEFAULT 'other' NOT NULL,
	"storage_key" text NOT NULL,
	"name" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"mime" text NOT NULL,
	"uploaded_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone,
	"engagement_id" uuid,
	"company_id" uuid,
	"deal_id" uuid
);--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_engagement_id_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attachments_engagement_idx" ON "attachments" USING btree ("engagement_id");--> statement-breakpoint
CREATE INDEX "attachments_company_idx" ON "attachments" USING btree ("company_id");--> statement-breakpoint

ALTER TABLE "activities" ADD COLUMN "engagement_id" uuid;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_engagement_id_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_engagement_idx" ON "activities" USING btree ("engagement_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "engagement_id" uuid;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_engagement_id_engagements_id_fk" FOREIGN KEY ("engagement_id") REFERENCES "public"."engagements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tasks_engagement_idx" ON "tasks" USING btree ("engagement_id");--> statement-breakpoint

-- Won deals from phase 2 become engagements, with the standard onboarding steps.
INSERT INTO "engagements" ("workspace_id", "company_id", "deal_id", "title", "service", "owner_id", "monthly_value_cents", "currency", "roles", "onboarding", "status")
SELECT d."workspace_id", d."company_id", d."id", d."title", d."service", d."owner_id", d."monthly_value_cents", d."currency",
       CASE WHEN d."seats" IS NOT NULL THEN jsonb_build_array(jsonb_build_object('role', coalesce(d."service", 'Team member'), 'seats', d."seats", 'hoursPerMonth', d."hours_per_month", 'staff', '[]'::jsonb)) ELSE '[]'::jsonb END,
       '[{"key":"kickoff","label":"Kick-off call held"},{"key":"contract","label":"Contract signed"},{"key":"requirements","label":"Roles and requirements confirmed"},{"key":"shortlist","label":"Candidates shortlisted"},{"key":"interviews","label":"Client interviews done"},{"key":"selected","label":"Staff selected"},{"key":"access","label":"Tools and access set up"},{"key":"sops","label":"SOPs and processes shared"},{"key":"start","label":"Staff started"},{"key":"checkin","label":"First-week check-in done"}]'::jsonb,
       'onboarding'
FROM "deals" d
JOIN "pipeline_stages" s ON s."id" = d."stage_id"
WHERE s."kind" = 'won'
  AND NOT EXISTS (SELECT 1 FROM "engagements" e WHERE e."deal_id" = d."id");

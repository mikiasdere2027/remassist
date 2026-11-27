-- SLA & SOP operational tracking (Phase 2 & 7)

ALTER TYPE "public"."user_role" ADD VALUE IF NOT EXISTS 'agent';

DO $$ BEGIN
  CREATE TYPE "public"."appointment_channel" AS ENUM('rem_agent', 'ai_assistant', 'internal');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."appointment_status" AS ENUM('scheduled', 'completed', 'cancelled', 'no_show', 'rescheduled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."shift_type" AS ENUM('weekday_day', 'weekday_eve', 'sat_full', 'sun_full', 'bench');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."incident_severity" AS ENUM('critical', 'high', 'standard');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "leads"
  ADD COLUMN IF NOT EXISTS "first_dial_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "sla_exclusion_reason" text DEFAULT 'none' NOT NULL,
  ADD COLUMN IF NOT EXISTS "tcpa_consent_verified" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "dnc_flag" boolean DEFAULT false NOT NULL;

CREATE TABLE IF NOT EXISTS "appointments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid DEFAULT '00000000-0000-4000-8000-000000000001' NOT NULL REFERENCES "workspaces"("id") ON DELETE restrict,
  "engagement_id" uuid REFERENCES "engagements"("id") ON DELETE set null,
  "lead_id" uuid NOT NULL REFERENCES "leads"("id") ON DELETE cascade,
  "booked_by_user_id" text REFERENCES "users"("id") ON DELETE set null,
  "booked_by_channel" "appointment_channel" DEFAULT 'rem_agent' NOT NULL,
  "status" "appointment_status" DEFAULT 'scheduled' NOT NULL,
  "scheduled_at" timestamp with time zone NOT NULL,
  "completed_at" timestamp with time zone,
  "status_updated_at" timestamp with time zone,
  "external_ref" text,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "appointments_workspace_scheduled_idx" ON "appointments" ("workspace_id", "scheduled_at" DESC);
CREATE INDEX IF NOT EXISTS "appointments_lead_idx" ON "appointments" ("lead_id", "scheduled_at" DESC);
CREATE INDEX IF NOT EXISTS "appointments_engagement_idx" ON "appointments" ("engagement_id", "scheduled_at" DESC);

CREATE TABLE IF NOT EXISTS "agent_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid DEFAULT '00000000-0000-4000-8000-000000000001' NOT NULL REFERENCES "workspaces"("id") ON DELETE restrict,
  "engagement_id" uuid REFERENCES "engagements"("id") ON DELETE set null,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "shift_type" "shift_type" NOT NULL,
  "started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_heartbeat_at" timestamp with time zone DEFAULT now() NOT NULL,
  "ended_at" timestamp with time zone,
  "handoff_notes" text,
  "appointments_booked" integer DEFAULT 0 NOT NULL
);

CREATE INDEX IF NOT EXISTS "agent_sessions_workspace_open_idx" ON "agent_sessions" ("workspace_id", "started_at" DESC) WHERE "ended_at" IS NULL;
CREATE INDEX IF NOT EXISTS "agent_sessions_user_idx" ON "agent_sessions" ("user_id", "started_at" DESC);

CREATE TABLE IF NOT EXISTS "sla_incidents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid DEFAULT '00000000-0000-4000-8000-000000000001' NOT NULL REFERENCES "workspaces"("id") ON DELETE restrict,
  "engagement_id" uuid REFERENCES "engagements"("id") ON DELETE set null,
  "severity" "incident_severity" DEFAULT 'critical' NOT NULL,
  "title" text NOT NULL,
  "summary" text,
  "detected_at" timestamp with time zone DEFAULT now() NOT NULL,
  "acknowledged_at" timestamp with time zone,
  "resolved_at" timestamp with time zone,
  "root_cause" text,
  "corrective_action" text
);

CREATE INDEX IF NOT EXISTS "sla_incidents_workspace_idx" ON "sla_incidents" ("workspace_id", "detected_at" DESC);

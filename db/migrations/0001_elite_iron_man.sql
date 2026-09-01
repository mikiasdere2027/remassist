ALTER TABLE "leads" ADD COLUMN "first_name" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "last_name" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "service_interest" text;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "consent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "raw_fields" jsonb;
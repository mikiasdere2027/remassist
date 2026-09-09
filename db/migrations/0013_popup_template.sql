CREATE TYPE "public"."popup_template" AS ENUM('corner', 'spotlight');--> statement-breakpoint
ALTER TABLE "popups" ADD COLUMN "template" "popup_template" DEFAULT 'corner' NOT NULL;

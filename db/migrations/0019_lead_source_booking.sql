-- CRM phase 5: leads created from a Calendly booking get their own source.
ALTER TYPE "public"."lead_source" ADD VALUE IF NOT EXISTS 'booking';

-- The Qualification tab's fields for the Rem Assist workspace (staffing
-- template). Data only: they are workspace custom fields, so another industry
-- edition gets its own set without a schema change. Re-runnable.

INSERT INTO "custom_field_defs" ("workspace_id", "record", "key", "label", "type", "options", "position")
VALUES
  ('00000000-0000-4000-8000-000000000001', 'lead', 'services_needed', 'Services needed', 'multiselect',
   '["Sales & Revenue","SDR as a Service","GTM Teams","Marketing & Content","Customer Service Agents","Virtual Back Office Team","Finance & Accounting","HR & Recruiting","Managed IT","AI & Automation","Industry Specific"]'::jsonb, 10),
  ('00000000-0000-4000-8000-000000000001', 'lead', 'roles_needed', 'Roles needed', 'text', NULL, 20),
  ('00000000-0000-4000-8000-000000000001', 'lead', 'seats_needed', 'Seats needed', 'number', NULL, 30),
  ('00000000-0000-4000-8000-000000000001', 'lead', 'budget', 'Monthly budget', 'select',
   '["Under $2k","$2k–$5k","$5k–$10k","$10k–$25k","Over $25k","Not shared"]'::jsonb, 40),
  ('00000000-0000-4000-8000-000000000001', 'lead', 'timeline', 'Start timeline', 'select',
   '["Immediately","Within a month","Next quarter","Just exploring"]'::jsonb, 50),
  ('00000000-0000-4000-8000-000000000001', 'lead', 'decision_maker', 'Decision maker', 'select',
   '["Yes, they decide","They influence the decision","Not yet known"]'::jsonb, 60),
  ('00000000-0000-4000-8000-000000000001', 'lead', 'current_setup', 'Current team or setup', 'long_text', NULL, 70),
  ('00000000-0000-4000-8000-000000000001', 'lead', 'pain_points', 'Pain points', 'long_text', NULL, 80),
  ('00000000-0000-4000-8000-000000000001', 'lead', 'fit', 'Fit assessment', 'select',
   '["Strong fit","Possible fit","Poor fit"]'::jsonb, 90)
ON CONFLICT ("workspace_id", "record", "key") DO NOTHING;

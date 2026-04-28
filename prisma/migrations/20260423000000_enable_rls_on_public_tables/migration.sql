-- Enable Row Level Security on all public tables.
-- The backend connects via Prisma using a privileged Postgres role that
-- bypasses RLS, so application queries are unaffected. Anon and authenticated
-- roles have no policies and are therefore denied all access via PostgREST.

ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."creators" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."campaigns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."shortlist_creators" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."share_links" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."invitations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."campaign_status_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."campaign_kpis" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."campaign_post_submissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."campaign_post_proofs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."campaign_metric_overrides" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."campaign_metric_proofs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."campaign_assets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."setup_items" ENABLE ROW LEVEL SECURITY;

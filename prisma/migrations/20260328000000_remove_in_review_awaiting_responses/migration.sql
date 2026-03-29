-- UpdateEnum: Remove in_review and awaiting_responses from CampaignStatus
-- First migrate any existing rows that use the old values
UPDATE "campaigns" SET "status" = 'submitted' WHERE "status" = 'in_review';
UPDATE "campaigns" SET "status" = 'active' WHERE "status" = 'awaiting_responses';
UPDATE "campaign_status_logs" SET "from_status" = 'submitted' WHERE "from_status" = 'in_review';
UPDATE "campaign_status_logs" SET "to_status" = 'submitted' WHERE "to_status" = 'in_review';
UPDATE "campaign_status_logs" SET "from_status" = 'active' WHERE "from_status" = 'awaiting_responses';
UPDATE "campaign_status_logs" SET "to_status" = 'active' WHERE "to_status" = 'awaiting_responses';

-- Recreate the enum without the removed values
ALTER TYPE "CampaignStatus" RENAME TO "CampaignStatus_old";
CREATE TYPE "CampaignStatus" AS ENUM ('draft', 'submitted', 'active', 'completed', 'rejected');

-- Drop defaults before altering column types, then restore them
ALTER TABLE "campaigns" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "campaigns" ALTER COLUMN "status" TYPE "CampaignStatus" USING "status"::text::"CampaignStatus";
ALTER TABLE "campaigns" ALTER COLUMN "status" SET DEFAULT 'draft'::"CampaignStatus";

ALTER TABLE "campaign_status_logs" ALTER COLUMN "from_status" TYPE "CampaignStatus" USING "from_status"::text::"CampaignStatus";
ALTER TABLE "campaign_status_logs" ALTER COLUMN "to_status" TYPE "CampaignStatus" USING "to_status"::text::"CampaignStatus";

DROP TYPE "CampaignStatus_old";

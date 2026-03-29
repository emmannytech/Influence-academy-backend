-- AlterTable: Add profile_picture to creators
ALTER TABLE "creators" ADD COLUMN "profile_picture" TEXT;

-- AlterTable: Add company_logo to clients
ALTER TABLE "clients" ADD COLUMN "company_logo" TEXT;

-- AlterTable: Add cover_image to campaigns
ALTER TABLE "campaigns" ADD COLUMN "cover_image" TEXT;

-- CreateEnum
CREATE TYPE "KpiType" AS ENUM ('posts', 'reach', 'impressions', 'views', 'engagement', 'clicks', 'conversions');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "campaign_kpis" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "type" "KpiType" NOT NULL,
    "target_value" INTEGER NOT NULL,
    "per_creator" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_kpis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_post_submissions" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "post_url" TEXT NOT NULL,
    "posted_at" TIMESTAMP(3),
    "reach" INTEGER,
    "impressions" INTEGER,
    "views" INTEGER,
    "engagement" INTEGER,
    "clicks" INTEGER,
    "conversions" INTEGER,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'pending',
    "review_note" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),

    CONSTRAINT "campaign_post_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_post_proofs" (
    "id" TEXT NOT NULL,
    "submission_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_post_proofs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_metric_overrides" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "type" "KpiType" NOT NULL,
    "reported_value" INTEGER NOT NULL,
    "note" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'pending',
    "review_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),

    CONSTRAINT "campaign_metric_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_metric_proofs" (
    "id" TEXT NOT NULL,
    "override_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_metric_proofs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "campaign_kpis_campaign_id_type_key" ON "campaign_kpis"("campaign_id", "type");

-- CreateIndex
CREATE INDEX "campaign_post_submissions_campaign_id_creator_id_idx" ON "campaign_post_submissions"("campaign_id", "creator_id");

-- CreateIndex
CREATE INDEX "campaign_post_submissions_campaign_id_status_idx" ON "campaign_post_submissions"("campaign_id", "status");

-- CreateIndex
CREATE INDEX "campaign_post_proofs_submission_id_idx" ON "campaign_post_proofs"("submission_id");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_metric_overrides_campaign_id_creator_id_type_key" ON "campaign_metric_overrides"("campaign_id", "creator_id", "type");

-- CreateIndex
CREATE INDEX "campaign_metric_proofs_override_id_idx" ON "campaign_metric_proofs"("override_id");

-- AddForeignKey
ALTER TABLE "campaign_kpis" ADD CONSTRAINT "campaign_kpis_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_post_submissions" ADD CONSTRAINT "campaign_post_submissions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_post_submissions" ADD CONSTRAINT "campaign_post_submissions_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_post_proofs" ADD CONSTRAINT "campaign_post_proofs_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "campaign_post_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_metric_overrides" ADD CONSTRAINT "campaign_metric_overrides_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_metric_overrides" ADD CONSTRAINT "campaign_metric_overrides_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_metric_proofs" ADD CONSTRAINT "campaign_metric_proofs_override_id_fkey" FOREIGN KEY ("override_id") REFERENCES "campaign_metric_overrides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

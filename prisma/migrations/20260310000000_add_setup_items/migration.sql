-- CreateEnum
CREATE TYPE "SetupCategory" AS ENUM ('country', 'niche', 'platform', 'industry');

-- CreateTable
CREATE TABLE "setup_items" (
    "id" TEXT NOT NULL,
    "category" "SetupCategory" NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "setup_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "setup_items_category_is_active_sort_order_idx" ON "setup_items"("category", "is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "setup_items_category_value_key" ON "setup_items"("category", "value");

-- AlterEnum
ALTER TYPE "SetupCategory" ADD VALUE 'city';

-- AlterTable
ALTER TABLE "setup_items" ADD COLUMN     "parent_id" TEXT;

-- CreateIndex
CREATE INDEX "setup_items_parent_id_idx" ON "setup_items"("parent_id");

-- AddForeignKey
ALTER TABLE "setup_items" ADD CONSTRAINT "setup_items_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "setup_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

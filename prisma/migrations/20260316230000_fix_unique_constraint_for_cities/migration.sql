-- DropIndex
DROP INDEX "setup_items_category_value_key";

-- CreateIndex (compound unique for cities — different countries can have same city name)
CREATE UNIQUE INDEX "setup_items_category_value_parent_id_key" ON "setup_items"("category", "value", "parent_id");

-- CreateIndex (partial unique for non-city items where parent_id IS NULL)
CREATE UNIQUE INDEX "setup_items_category_value_no_parent_key" ON "setup_items"("category", "value") WHERE "parent_id" IS NULL;

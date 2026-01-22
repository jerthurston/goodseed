-- AlterTable
ALTER TABLE "SeedProduct" ADD COLUMN     "displayPrice" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "SeedProduct_displayPrice_idx" ON "SeedProduct"("displayPrice");

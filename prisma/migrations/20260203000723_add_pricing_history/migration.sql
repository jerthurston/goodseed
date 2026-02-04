-- CreateTable
CREATE TABLE "PricingHistory" (
    "id" TEXT NOT NULL,
    "seedProductId" TEXT NOT NULL,
    "packSize" INTEGER NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "pricePerSeed" DOUBLE PRECISION NOT NULL,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT DEFAULT 'scraper',

    CONSTRAINT "PricingHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PricingHistory_seedProductId_packSize_scrapedAt_idx" ON "PricingHistory"("seedProductId", "packSize", "scrapedAt");

-- CreateIndex
CREATE INDEX "PricingHistory_scrapedAt_idx" ON "PricingHistory"("scrapedAt");

-- AddForeignKey
ALTER TABLE "PricingHistory" ADD CONSTRAINT "PricingHistory_seedProductId_fkey" FOREIGN KEY ("seedProductId") REFERENCES "SeedProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable Pricing - Add timestamps and index
ALTER TABLE "Pricing" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Pricing" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Pricing_seedProductId_packSize_idx" ON "Pricing"("seedProductId", "packSize");

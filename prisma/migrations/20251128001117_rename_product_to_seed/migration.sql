/*
  Warnings:

  - You are about to drop the `Product` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductImage` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_sellerId_fkey";

-- DropForeignKey
ALTER TABLE "ProductImage" DROP CONSTRAINT "ProductImage_imageId_fkey";

-- DropForeignKey
ALTER TABLE "ProductImage" DROP CONSTRAINT "ProductImage_productId_fkey";

-- DropTable
DROP TABLE "Product";

-- DropTable
DROP TABLE "ProductImage";

-- CreateTable
CREATE TABLE "Seed" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "packSize" INTEGER NOT NULL,
    "pricePerSeed" DOUBLE PRECISION NOT NULL,
    "stockStatus" "StockStatus" NOT NULL DEFAULT 'IN_STOCK',
    "seedType" "SeedType",
    "cannabisType" "CannabisType",
    "photoperiodType" "PhotoperiodType",
    "thcMin" DOUBLE PRECISION,
    "thcMax" DOUBLE PRECISION,
    "cbdMin" DOUBLE PRECISION,
    "cbdMax" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Seed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeedImage" (
    "seedId" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeedImage_pkey" PRIMARY KEY ("seedId","imageId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Seed_url_key" ON "Seed"("url");

-- CreateIndex
CREATE INDEX "Seed_pricePerSeed_idx" ON "Seed"("pricePerSeed");

-- CreateIndex
CREATE INDEX "Seed_seedType_idx" ON "Seed"("seedType");

-- CreateIndex
CREATE INDEX "Seed_cannabisType_idx" ON "Seed"("cannabisType");

-- CreateIndex
CREATE INDEX "Seed_thcMin_thcMax_idx" ON "Seed"("thcMin", "thcMax");

-- CreateIndex
CREATE INDEX "Seed_cbdMin_cbdMax_idx" ON "Seed"("cbdMin", "cbdMax");

-- CreateIndex
CREATE INDEX "Seed_stockStatus_idx" ON "Seed"("stockStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Seed_sellerId_slug_key" ON "Seed"("sellerId", "slug");

-- CreateIndex
CREATE INDEX "SeedImage_seedId_idx" ON "SeedImage"("seedId");

-- CreateIndex
CREATE INDEX "SeedImage_imageId_idx" ON "SeedImage"("imageId");

-- CreateIndex
CREATE INDEX "SeedImage_isPrimary_idx" ON "SeedImage"("isPrimary");

-- AddForeignKey
ALTER TABLE "Seed" ADD CONSTRAINT "Seed_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeedImage" ADD CONSTRAINT "SeedImage_seedId_fkey" FOREIGN KEY ("seedId") REFERENCES "Seed"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeedImage" ADD CONSTRAINT "SeedImage_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;

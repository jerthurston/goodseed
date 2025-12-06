/*
  Warnings:

  - You are about to drop the `Seed` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SeedImage` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Seed" DROP CONSTRAINT "Seed_sellerId_fkey";

-- DropForeignKey
ALTER TABLE "SeedImage" DROP CONSTRAINT "SeedImage_imageId_fkey";

-- DropForeignKey
ALTER TABLE "SeedImage" DROP CONSTRAINT "SeedImage_seedId_fkey";

-- DropTable
DROP TABLE "Seed";

-- DropTable
DROP TABLE "SeedImage";

-- CreateTable
CREATE TABLE "SeedCategory" (
    "id" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "seedType" "SeedType",
    "photoperiodType" "PhotoperiodType",
    "startingPrice" DOUBLE PRECISION,
    "variety" TEXT,
    "thcMin" DOUBLE PRECISION,
    "thcMax" DOUBLE PRECISION,
    "thcText" TEXT,
    "cbdMin" DOUBLE PRECISION,
    "cbdMax" DOUBLE PRECISION,
    "cbdText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeedCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeedProduct" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "basePrice" DOUBLE PRECISION NOT NULL,
    "packSize" INTEGER NOT NULL DEFAULT 4,
    "pricePerSeed" DOUBLE PRECISION NOT NULL,
    "stockStatus" "StockStatus" NOT NULL DEFAULT 'IN_STOCK',
    "cannabisType" "CannabisType",
    "variety" TEXT,
    "thcMin" DOUBLE PRECISION,
    "thcMax" DOUBLE PRECISION,
    "thcText" TEXT,
    "cbdMin" DOUBLE PRECISION,
    "cbdMax" DOUBLE PRECISION,
    "cbdText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeedProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeedProductImage" (
    "seedProductId" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeedProductImage_pkey" PRIMARY KEY ("seedProductId","imageId")
);

-- CreateIndex
CREATE INDEX "SeedCategory_sellerId_idx" ON "SeedCategory"("sellerId");

-- CreateIndex
CREATE INDEX "SeedCategory_seedType_idx" ON "SeedCategory"("seedType");

-- CreateIndex
CREATE INDEX "SeedCategory_startingPrice_idx" ON "SeedCategory"("startingPrice");

-- CreateIndex
CREATE UNIQUE INDEX "SeedCategory_sellerId_slug_key" ON "SeedCategory"("sellerId", "slug");

-- CreateIndex
CREATE INDEX "SeedProduct_categoryId_idx" ON "SeedProduct"("categoryId");

-- CreateIndex
CREATE INDEX "SeedProduct_pricePerSeed_idx" ON "SeedProduct"("pricePerSeed");

-- CreateIndex
CREATE INDEX "SeedProduct_cannabisType_idx" ON "SeedProduct"("cannabisType");

-- CreateIndex
CREATE INDEX "SeedProduct_thcMin_thcMax_idx" ON "SeedProduct"("thcMin", "thcMax");

-- CreateIndex
CREATE INDEX "SeedProduct_cbdMin_cbdMax_idx" ON "SeedProduct"("cbdMin", "cbdMax");

-- CreateIndex
CREATE INDEX "SeedProduct_stockStatus_idx" ON "SeedProduct"("stockStatus");

-- CreateIndex
CREATE UNIQUE INDEX "SeedProduct_categoryId_slug_key" ON "SeedProduct"("categoryId", "slug");

-- CreateIndex
CREATE INDEX "SeedProductImage_seedProductId_idx" ON "SeedProductImage"("seedProductId");

-- CreateIndex
CREATE INDEX "SeedProductImage_imageId_idx" ON "SeedProductImage"("imageId");

-- CreateIndex
CREATE INDEX "SeedProductImage_isPrimary_idx" ON "SeedProductImage"("isPrimary");

-- AddForeignKey
ALTER TABLE "SeedCategory" ADD CONSTRAINT "SeedCategory_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeedProduct" ADD CONSTRAINT "SeedProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SeedCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeedProductImage" ADD CONSTRAINT "SeedProductImage_seedProductId_fkey" FOREIGN KEY ("seedProductId") REFERENCES "SeedProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeedProductImage" ADD CONSTRAINT "SeedProductImage_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;

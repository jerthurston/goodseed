/*
  Warnings:

  - You are about to drop the column `basePrice` on the `SeedProduct` table. All the data in the column will be lost.
  - You are about to drop the column `packSize` on the `SeedProduct` table. All the data in the column will be lost.
  - You are about to drop the column `pricePerSeed` on the `SeedProduct` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "SeedProduct_pricePerSeed_idx";

-- AlterTable
ALTER TABLE "SeedProduct" DROP COLUMN "basePrice",
DROP COLUMN "packSize",
DROP COLUMN "pricePerSeed";

-- CreateTable
CREATE TABLE "Pricing" (
    "id" TEXT NOT NULL,
    "seedProductId" TEXT NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "packSize" INTEGER NOT NULL DEFAULT 5,
    "pricePerSeed" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Pricing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Pricing_pricePerSeed_idx" ON "Pricing"("pricePerSeed");

-- AddForeignKey
ALTER TABLE "Pricing" ADD CONSTRAINT "Pricing_seedProductId_fkey" FOREIGN KEY ("seedProductId") REFERENCES "SeedProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

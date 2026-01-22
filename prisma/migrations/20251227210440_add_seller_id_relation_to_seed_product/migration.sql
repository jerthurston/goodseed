/*
  Warnings:

  - Added the required column `sellerId` to the `SeedProduct` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SeedProduct" ADD COLUMN     "sellerId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "SeedProduct_sellerId_idx" ON "SeedProduct"("sellerId");

-- AddForeignKey
ALTER TABLE "SeedProduct" ADD CONSTRAINT "SeedProduct_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller"("id") ON DELETE CASCADE ON UPDATE CASCADE;
